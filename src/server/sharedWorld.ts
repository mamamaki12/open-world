// みんなのワールドの正本をサーバーで扱う純粋な処理（ブラウザーのstoreには依存しない）
import type { House } from '../building/types';
import { emptyHouse } from '../building/types';
import { sampleHouse } from '../building/sample';
import { LOT_D, LOT_W, lotSize } from '../building/dimensions';
import { renovationCost } from '../economy/pricing';
import { DAY_SECONDS, stepMarket } from '../economy/market';
import { JOINED_W, START_PLOT } from '../economy/town';
import { applyChanges } from '../session/edits';
import type { Change } from '../session/edits';
import type { Lot } from '../state/economy';
import type { WorldSave } from '../session/saves';

export interface SharedCommand { id: string; lot: string; delta: Change[]; reserved: number; settle?: boolean; undoOf?: string }
export interface SharedResult { id: string; ok: boolean; cost?: number; message?: string }
type Receipt = WorldSave['receipts'][string];

export const SHARED_LIMIT = 10;
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function initialSharedWorld(id: string): WorldSave {
  const square: Lot = { id: 'shared-square', name: 'みんなの広場', location: 'rural', variance: 1, built: sampleHouse(),
    design: null, construction: null, rented: false, invested: 0, plot: START_PLOT };
  return { worldId: id, doors: {}, receipts: {}, house: square.built ?? emptyHouse(),
    economy: { day: 1, clock: 0, market: 1, marketHistory: [1], lots: [square], currentLotId: square.id, offers: [] } };
}

/** 持ち主のいない土地は誰でも、持ち主のいる土地はその人だけが建てられる */
export function canBuildOn(lot: Lot, member: string): boolean { return !lot.owner || lot.owner === member; }

function houseOf(w: WorldSave, id: string): House | null {
  const l = w.economy.lots.find(l => l.id === id);
  return !l ? null : id === w.economy.currentLotId ? w.house : l.design ?? l.built;
}
function withHouse(w: WorldSave, id: string, house: House): WorldSave {
  return { ...w, house: id === w.economy.currentLotId ? house : w.house,
    economy: { ...w.economy, lots: w.economy.lots.map(l => l.id === id ? { ...l, built: house, design: null, construction: null } : l) } };
}

/** 建築の操作を検証して適用する。失敗したときは元の世界をそのまま返す */
export function applyCommand(w: WorldSave, sender: string, c: SharedCommand): { world: WorldSave; result: SharedResult; changed: boolean } {
  const fail = (message: string) => ({ world: w, result: { id: c?.id, ok: false, message }, changed: false });
  if (!c || typeof c.id !== 'string' || !c.id || c.id.length > 120) return fail('操作IDが不正です');
  const receipts = w.receipts as Record<string, Receipt>, prior = receipts[c.id];
  if (prior) {
    if (prior.sender !== sender) return fail('操作IDが重複しました');
    return prior.cancelled ? fail('未確定だった建築費を返しました') : { world: w, result: { id: c.id, ok: true, cost: prior.cost }, changed: false };
  }
  if (c.settle) {
    // 届かなかった操作は取り消し扱いで記録し、あとから同じIDが届いても適用しない
    return { world: { ...w, receipts: { ...receipts, [c.id]: { sender, cost: 0, cancelled: true } } },
      result: { id: c.id, ok: false, message: '未確定だった建築費を返しました' }, changed: true };
  }
  try {
    const lot = w.economy.lots.find(l => l.id === c.lot), before = houseOf(w, c.lot);
    if (!lot || !before) return fail('編集する土地がありません');
    if (!canBuildOn(lot, sender)) return fail('ほかの人の土地には建てられません');
    if (lot.construction) return fail('工事の完了後に編集してください');
    const undo = c.undoOf ? receipts[c.undoOf] : null;
    if (c.undoOf && (!undo || undo.sender !== sender || undo.undone || undo.cancelled ||
      JSON.stringify(undo.delta?.map(x => ({ ...x, before: x.after, after: x.before }))) !== JSON.stringify(c.delta))) return fail('自分の操作だけを一度ずつ戻せます');
    const previous = { ...lotSize };
    let next: House, cost: number;
    try {
      Object.assign(lotSize, { w: typeof lot.joined === 'number' ? JOINED_W : LOT_W, d: LOT_D });
      next = applyChanges(before, c.delta);
      cost = c.undoOf ? 0 : renovationCost(before, next).total;
    } finally { Object.assign(lotSize, previous); }
    if (!Number.isSafeInteger(c.reserved) || c.reserved < cost) return fail('費用が変わりました。最新の状態でやり直してください');
    const nextReceipts: Record<string, Receipt> = { ...receipts, [c.id]: { sender, cost, delta: c.delta } };
    if (c.undoOf) nextReceipts[c.undoOf] = { ...undo!, undone: true };
    const ids = Object.keys(nextReceipts);
    for (const id of ids.slice(0, -800)) if (nextReceipts[id].delta) nextReceipts[id] = { ...nextReceipts[id], delta: undefined };
    const world = { ...withHouse(w, c.lot, next), receipts: nextReceipts };
    if (JSON.stringify(world).length > 1800000) return fail('ワールドの保存量が上限に達したため、この変更を確定できません');
    return { world, result: { id: c.id, ok: true, cost }, changed: true };
  } catch (e) { return fail(e instanceof Error ? e.message : '変更できませんでした'); }
}

/** 時計と相場を進める。日付が変わったら true */
export function tickWorld(w: WorldSave, dt: number, rng: () => number): { world: WorldSave; newDay: boolean } {
  let { clock, day, market, marketHistory } = w.economy;
  clock += dt;
  if (clock < DAY_SECONDS) return { world: { ...w, economy: { ...w.economy, clock } }, newDay: false };
  clock -= DAY_SECONDS; day += 1; market = stepMarket(market, rng);
  marketHistory = [...marketHistory, market].slice(-60);
  return { world: { ...w, economy: { ...w.economy, clock, day, market, marketHistory } }, newDay: true };
}

export function validSharedWorld(v: unknown): v is WorldSave {
  const w = v as WorldSave;
  return !!w && typeof w.worldId === 'string' && !!w.house && !!w.economy && Array.isArray(w.economy.lots) &&
    [w.economy.day, w.economy.clock, w.economy.market].every(Number.isFinite) && !!w.receipts && typeof w.receipts === 'object';
}
export const cloneWorld = copy;
