// みんなのワールドの正本をサーバーで扱う純粋な処理（ブラウザーのstoreには依存しない）
import type { House } from '../building/types';
import { emptyHouse } from '../building/types';
import { LOT_D, LOT_W, lotSize } from '../building/dimensions';
import { DAY_SECONDS, landOffers, landPrice, stepMarket, getLocation } from '../economy/market';
import type { LandOffer } from '../economy/market';
import { JOINED_W, freePlot } from '../economy/town';
import { townHouseLot } from '../building/townHouses';
import { lotsDensity } from '../economy/neighborhood';
import { applyChanges } from '../session/edits';
import type { Change } from '../session/edits';
import type { Lot } from '../state/economy';
import type { WorldSave } from '../session/saves';
import { cleanShop, recordPlay, recordSale, ARCADE_PLAY, RIDE_PLAY } from '../economy/shop';
import { REQUEST_LIMITS, cleanRequests, requestError, stepRequest } from '../economy/requests';
import type { RequestOp } from '../economy/requests';

/** 建築以外の操作。家・土地の代金は買った人の口座から売り手の口座へ直接移る（新しい土地だけは不動産屋へ払う） */
export type SharedAction = { type: 'buyLand'; offer: string } | { type: 'townHouse'; plot: number } | { type: 'list'; price: number | null } | { type: 'buyLot' }
  | { type: 'offerRent'; rent: number | null } | { type: 'rentLot' } | { type: 'endLease' }
  | { type: 'money'; delta: number; label: string } | { type: 'cars'; cars: unknown[] } | { type: 'stocks'; holdings: Record<string, unknown> }
  | { type: 'shop'; shop: unknown } | { type: 'purchase'; item: string; price: number; day?: number } | { type: 'play'; fee: number; kind?: 'arcade' | 'ride' }
  | { type: 'request'; title: string; description: string; reward: number } | { type: 'requestStep'; request: string; op: RequestOp }

export interface SharedCommand { id: string; lot: string; delta: Change[]; reserved: number; settle?: boolean; undoOf?: string; action?: SharedAction }
/** 共有側の口座。所持金は端末の個別ワールドと同期し、車や株は共有側だけに保存する。 */
export interface Account { name: string; money: number; ledger: { day: number; label: string; amount: number }[]; cars: unknown[]; stocks?: Record<string, unknown> }
export type SharedWorld = WorldSave & { accounts?: Record<string, Account> };
export const SHARED_START_MONEY = 1_000_000;
export interface SharedResult { id: string; ok: boolean; cost?: number; message?: string }
type Receipt = WorldSave['receipts'][string];

export const SHARED_LIMIT = 10;
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function initialSharedWorld(id: string): WorldSave {
  // 土地はだれも持っていない状態から始まる
  const w: SharedWorld = { worldId: id, doors: {}, receipts: {}, accounts: {}, house: emptyHouse(),
    economy: { day: 1, clock: 0, market: 1, marketHistory: [1], lots: [], currentLotId: null, offers: [] } };
  w.economy.offers = sharedOffers(w, Math.random);
  return w;
}

export function withAccount(w: SharedWorld, id: string, name: string): SharedWorld {
  const a = w.accounts?.[id];
  if (a && a.name === name) return w;
  return { ...w, accounts: { ...w.accounts, [id]: a ? { ...a, name } :
    { name, money: SHARED_START_MONEY, ledger: [{ day: w.economy.day, label: 'はじめの所持金', amount: SHARED_START_MONEY }], cars: [] } } };
}
function charge(w: SharedWorld, id: string, amount: number, label: string, allowDebt = false): SharedWorld | string {
  const a = w.accounts?.[id];
  if (!a) return '口座がありません';
  if (!Number.isSafeInteger(a.money - amount)) return '金額が不正です';
  if (!allowDebt && amount > 0 && a.money < amount) return 'お金が足りません';
  if (!amount) return w;
  return { ...w, accounts: { ...w.accounts, [id]: { ...a, money: a.money - amount, ledger: [{ day: w.economy.day, label, amount: -amount }, ...a.ledger].slice(0, 50) } } };
}
/** 配信用。口座は本人にだけ送る */
export function publicWorld(w: SharedWorld): WorldSave { const { accounts: _hidden, ...rest } = w; return rest; }

const plotsOfLots = (lots: Lot[]) => lots.flatMap(l => [l.plot, l.joined].filter((p): p is number => typeof p === 'number'));
/** 不動産屋の売り土地を、まだだれの土地でもない区画に並べる */
export function sharedOffers(w: WorldSave, rng: () => number): LandOffer[] {
  const taken = new Set(plotsOfLots(w.economy.lots));
  return landOffers(w.economy.day, rng).flatMap(o => {
    const plot = freePlot(o.location, taken, rng);
    if (plot === null) return [];
    taken.add(plot); return [{ ...o, plot }];
  });
}

function applyAction(w: SharedWorld, sender: string, name: string, c: SharedCommand, a: SharedAction): { world: SharedWorld; cost: number; message: string } | string {
  const lots = w.economy.lots, lot = lots.find(l => l.id === c.lot);
  if (a.type === 'money') {
    // カジノやバイトなど端末で計算するお金の出入り（端末の申告を信頼する。将来はサーバーで計算する）
    if (!Number.isSafeInteger(a.delta) || Math.abs(a.delta) > 1e13 || typeof a.label !== 'string') return '金額が不正です';
    // Offline property expenses can produce debt; carry that balance without allowing purchases on credit.
    const paid = charge(w, sender, -a.delta, a.label.slice(0, 60), true);
    return typeof paid === 'string' ? paid : { world: paid, cost: 0, message: '' };
  }
  if (a.type === 'stocks') {
    if (!a.holdings || typeof a.holdings !== 'object' || JSON.stringify(a.holdings).length > 20000) return '株の情報が不正です';
    const acc = w.accounts?.[sender]; if (!acc) return '口座がありません';
    return { world: { ...w, accounts: { ...w.accounts, [sender]: { ...acc, stocks: a.holdings } } }, cost: 0, message: '' };
  }
  if (a.type === 'cars') {
    if (!Array.isArray(a.cars) || a.cars.length > 10 || JSON.stringify(a.cars).length > 20000) return '車の情報が不正です';
    const acc = w.accounts?.[sender]; if (!acc) return '口座がありません';
    return { world: { ...w, accounts: { ...w.accounts, [sender]: { ...acc, cars: a.cars } } }, cost: 0, message: '' };
  }
  const withLots = (next: Lot[]): SharedWorld => ({ ...w, economy: { ...w.economy, lots: next } });
  if (a.type === 'buyLand') {
    const offer = w.economy.offers.find(o => o.id === a.offer);
    if (!offer || typeof offer.plot !== 'number') return 'その土地はもう売れてしまいました';
    if (plotsOfLots(lots).includes(offer.plot)) return 'その区画はもう使われています';
    if (lots.length >= 90) return 'この町にはもう土地を増やせません';
    const price = landPrice(offer.location, offer.variance, w.economy.market, lotsDensity(offer.plot, lots));
    if (!Number.isSafeInteger(c.reserved) || c.reserved < price) return '値段が変わりました。最新の状態でやり直してください';
    const bought: Lot = { id: 'lot-' + c.id.slice(0, 40), name: `${offer.name}（${getLocation(offer.location).name}）`, location: offer.location, variance: offer.variance,
      built: null, design: null, construction: null, rented: false, invested: price, plot: offer.plot, owner: sender, ownerName: name };
    const paid = charge(w, sender, price, '土地の購入（' + bought.name + '）');
    if (typeof paid === 'string') return paid;
    const current = w.economy.currentLotId ?? bought.id;
    return { world: { ...paid, economy: { ...w.economy, lots: [...lots, bought], currentLotId: current, offers: w.economy.offers.filter(o => o.id !== offer.id) } }, cost: price, message: bought.name + 'を買いました' };
  }
  if (a.type === 'townHouse') {
    // 町に最初から建っている家を、だれでも編集できる土地にする（持ち主なし・売買や賃貸はできない）
    const town = Number.isSafeInteger(a.plot) ? townHouseLot(a.plot) : null;
    if (!town) return 'その家は編集できません';
    if (lots.some(l => l.id === town.id)) return { world: w, cost: 0, message: '' };
    if (plotsOfLots(lots).includes(a.plot)) return 'その区画はもう使われています';
    if (lots.length >= 90) return 'この町にはもう土地を増やせません';
    return { world: withLots([...lots, town]), cost: 0, message: '' };
  }
  if (!lot) return 'その土地はありません';
  if (a.type === 'list') {
    if (lot.owner !== sender) return '自分の土地だけ売りに出せます';
    if (lot.construction) return '工事中は売りに出せません';
    if (a.price !== null && cleanRequests(lot.requests).length) return '仕事の依頼が残っている間は売りに出せません';
    if (a.price !== null && !(Number.isSafeInteger(a.price) && a.price > 0 && a.price <= 1e13)) return '値段が不正です';
    const next = lots.map(l => l.id === lot.id ? { ...l, listing: a.price === null ? undefined : { price: a.price } } : l);
    return { world: withLots(next), cost: 0, message: a.price === null ? '売りに出すのをやめました' : '売りに出しました' };
  }
  if (a.type === 'offerRent') {
    if (lot.owner !== sender) return '自分の家だけ貸し出せます';
    if (lot.tenant) return '貸している間は家賃を変えられません';
    if (a.rent !== null && !(Number.isSafeInteger(a.rent) && a.rent > 0 && a.rent <= 1e11)) return '家賃が不正です';
    const next = lots.map(l => l.id === lot.id ? { ...l, rentOffer: a.rent === null ? undefined : { rent: a.rent } } : l);
    return { world: withLots(next), cost: 0, message: a.rent === null ? '貸し出しをやめました' : '借りる人を募集しました' };
  }
  if (a.type === 'rentLot') {
    // 借りた日のぶんの家賃を先に払う。以後は毎日、借りた人から持ち主へ払う
    if (!lot.rentOffer || !lot.owner) return 'その家は貸し出されていません';
    if (lot.tenant) return 'その家はもう借りられています';
    if (lot.owner === sender) return '自分の家は借りられません';
    if (lots.some(l => l.tenant === sender)) return '借りられる家は1軒までです';
    const rent = lot.rentOffer.rent;
    const paid = charge(w, sender, rent, `家賃（${lot.name}）`);
    if (typeof paid === 'string') return paid;
    const received = paid.accounts?.[lot.owner] ? charge(paid, lot.owner, -rent, `家賃収入（${lot.name}・${name}さん）`) : paid;
    if (typeof received === 'string') return received;
    const next = lots.map(l => l.id === lot.id ? { ...l, tenant: sender, tenantName: name } : l);
    return { world: { ...received, economy: { ...received.economy, lots: next } }, cost: rent, message: lot.name + 'を借りました' };
  }
  if (a.type === 'shop') {
    // 自分の土地をお店にする・商品を変える（null で閉店）。売上の記録は持ち主でも書き換えられない
    if (lot.owner !== sender) return '自分の土地だけお店にできます';
    const { shop: _old, ...rest } = lot;
    if (a.shop === null) return { world: withLots(lots.map(l => l.id === lot.id ? rest : l)), cost: 0, message: 'お店を閉じました' };
    const shop = cleanShop(a.shop);
    if (!shop) return 'お店の内容が不正です';
    const kept = cleanShop(lot.shop);
    const next = { ...shop, sales: kept?.sales ?? [], revenue: kept?.revenue ?? 0 };
    if (JSON.stringify(next).length > 900_000) return 'お店の写真が多すぎます';
    return { world: withLots(lots.map(l => l.id === lot.id ? { ...rest, shop: next } : l)), cost: 0, message: '' };
  }
  if (a.type === 'purchase') {
    // 一回払い。代金は買った人から店の持ち主へ直接移る
    const shop = cleanShop(lot.shop);
    if (!shop || !lot.owner) return 'このお店は閉まっています';
    if (lot.owner === sender) return '自分のお店では買えません';
    if (typeof a.item !== 'string' || !Number.isSafeInteger(c.reserved) || c.reserved < a.price) return '値段が変わりました。もう一度確認してください';
    const sale = recordSale(shop, { id: c.id, day: w.economy.day, buyer: name, buyerId: sender, itemId: a.item, price: a.price, forDay: a.day });
    if (typeof sale === 'string') return sale;
    const paid = charge(w, sender, sale.item.price, `買い物：${sale.item.name}（${shop.name}）`);
    if (typeof paid === 'string') return paid;
    const received = paid.accounts?.[lot.owner] ? charge(paid, lot.owner, -sale.item.price, `お店の売上：${sale.item.name}（${name}さん）`) : paid;
    if (typeof received === 'string') return received;
    const next = received.economy.lots.map(l => l.id === lot.id ? { ...l, shop: sale.shop } : l);
    return { world: { ...received, economy: { ...received.economy, lots: next } }, cost: sale.item.price, message: `「${sale.item.name}」を買いました` };
  }
  if (a.type === 'request') {
    // 仕事を頼む・人を雇う。報酬はこの時点で依頼主の口座から預かる
    if (lot.owner !== sender) return '自分の土地から依頼を出してください';
    if (lot.listing) return '売りに出している土地からは依頼を出せません';
    const list = cleanRequests(lot.requests);
    if (list.length >= REQUEST_LIMITS.perLot) return `依頼は1つの土地に${REQUEST_LIMITS.perLot}件までです`;
    const err = requestError(a);
    if (err) return err;
    if (!Number.isSafeInteger(c.reserved) || c.reserved < a.reward) return '報酬の預かりが足りません';
    const req = cleanRequests([{ id: c.id, title: a.title, description: a.description, reward: a.reward, poster: sender, posterName: name, day: w.economy.day }])[0];
    const held = charge(w, sender, a.reward, `依頼の報酬を預けた：${req.title}`);
    if (typeof held === 'string') return held;
    const next = held.economy.lots.map(l => l.id === lot.id ? { ...l, requests: [...list, req] } : l);
    return { world: { ...held, economy: { ...held.economy, lots: next } }, cost: a.reward, message: `「${req.title}」を依頼しました（報酬は預かりました）` };
  }
  if (a.type === 'requestStep') {
    const step = stepRequest(cleanRequests(lot.requests), String(a.request), a.op, sender, name);
    if (typeof step === 'string') return step;
    const paid = step.pay && w.accounts?.[step.pay.to] ? charge(w, step.pay.to, -step.pay.amount, step.pay.label) : w;
    if (typeof paid === 'string') return paid;
    const next = paid.economy.lots.map(l => l.id === lot.id ? { ...l, requests: step.list.length ? step.list : undefined } : l);
    return { world: { ...paid, economy: { ...paid.economy, lots: next } }, cost: 0, message: step.message };
  }
  if (a.type === 'play') {
    // お店のゲーム機・コイン式の乗り物で1回遊ぶ。料金は遊んだ人から店の持ち主へ
    const shop = cleanShop(lot.shop);
    if (!shop || !lot.owner) return 'このお店は閉まっています';
    if (lot.owner === sender) return '自分のお店の遊具は無料で遊べます';
    const kind = a.kind === 'ride' ? 'ride' : 'arcade';
    const label = kind === 'ride' ? 'コイン式の乗り物' : 'ゲーム機';
    if (!Number.isSafeInteger(c.reserved) || c.reserved < a.fee) return '料金が変わりました。もう一度確認してください';
    const played = recordPlay(shop, { id: c.id, day: w.economy.day, buyer: name, buyerId: sender, fee: a.fee }, kind === 'ride' ? RIDE_PLAY : ARCADE_PLAY);
    if (typeof played === 'string') return played;
    const paid = charge(w, sender, a.fee, `${label}（${shop.name}）`);
    if (typeof paid === 'string') return paid;
    const received = paid.accounts?.[lot.owner] ? charge(paid, lot.owner, -a.fee, `${label}の売上（${name}さん）`) : paid;
    if (typeof received === 'string') return received;
    const next = received.economy.lots.map(l => l.id === lot.id ? { ...l, shop: played } : l);
    return { world: { ...received, economy: { ...received.economy, lots: next } }, cost: a.fee, message: '' };
  }
  if (a.type === 'endLease') {
    if (!lot.tenant || (lot.tenant !== sender && lot.owner !== sender)) return '借りている家ではありません';
    const next = lots.map(l => l.id === lot.id ? { ...l, tenant: undefined, tenantName: undefined } : l);
    return { world: withLots(next), cost: 0, message: '賃貸を終了しました' };
  }
  // buyLot: 売りに出ている土地を買う。代金は買った人から売り手へ直接移る
  if (!lot.listing || !lot.owner) return 'その土地は売りに出ていません';
  if (lot.owner === sender) return '自分の土地は買えません';
  const price = lot.listing.price, seller = lot.owner;
  if (!Number.isSafeInteger(c.reserved) || c.reserved < price) return '値段が変わりました。最新の状態でやり直してください';
  const paid = charge(w, sender, price, `${lot.name}の購入`);
  if (typeof paid === 'string') return paid;
  const received = paid.accounts?.[seller] ? charge(paid, seller, -price, `${lot.name}が${name}さんに売れました`) : paid;
  if (typeof received === 'string') return received;
  const next = lots.map(l => l.id === lot.id ? { ...l, owner: sender, ownerName: name, listing: undefined, invested: price, rented: false } : l);
  return { world: { ...received, economy: { ...received.economy, lots: next } }, cost: price, message: lot.name + 'を買いました' };
}


function houseOf(w: WorldSave, id: string): House | null {
  const l = w.economy.lots.find(l => l.id === id);
  return !l ? null : id === w.economy.currentLotId ? w.house : l.design ?? l.built ?? emptyHouse();
}
function withHouse(w: SharedWorld, id: string, house: House): SharedWorld {
  return { ...w, house: id === w.economy.currentLotId ? house : w.house,
    economy: { ...w.economy, lots: w.economy.lots.map(l => l.id === id ? { ...l, built: house, design: null, construction: null } : l) } };
}

/** 建築の操作を検証して適用する。失敗したときは元の世界をそのまま返す */
export function applyCommand(w: SharedWorld, sender: string, c: SharedCommand, name = 'ゲスト'): { world: SharedWorld; result: SharedResult; changed: boolean } {
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
  if (c.action) {
    const done = applyAction(w, sender, name, c, c.action);
    if (typeof done === 'string') return fail(done);
    const world = { ...done.world, receipts: { ...receipts, [c.id]: { sender, cost: done.cost } } };
    return { world, result: { id: c.id, ok: true, cost: done.cost, message: done.message }, changed: true };
  }
  try {
    const lot = w.economy.lots.find(l => l.id === c.lot), before = houseOf(w, c.lot);
    if (!lot || !before) return fail('編集する土地がありません');
    if (lot.shop && lot.owner && lot.owner !== sender) return fail('お店は持ち主しか変えられません');
    if (lot.construction) return fail('工事の完了後に編集してください');
    const undo = c.undoOf ? receipts[c.undoOf] : null;
    if (c.undoOf && (!undo || undo.sender !== sender || undo.undone || undo.cancelled ||
      JSON.stringify(undo.delta?.map(x => ({ ...x, before: x.after, after: x.before }))) !== JSON.stringify(c.delta))) return fail('自分の操作だけを一度ずつ戻せます');
    const previous = { ...lotSize };
    let next: House, cost: number;
    try {
      Object.assign(lotSize, { w: typeof lot.joined === 'number' ? JOINED_W : LOT_W, d: LOT_D });
      next = applyChanges(before, c.delta);
      cost = 0; // 着工は無料（ひとりモードと同じ）
    } finally { Object.assign(lotSize, previous); }
    if (!Number.isSafeInteger(c.reserved) || c.reserved < cost) return fail('費用が変わりました。最新の状態でやり直してください');
    const charged = charge(w, sender, cost, '建築（' + lot.name + '）');
    if (typeof charged === 'string') return fail(charged);
    const nextReceipts: Record<string, Receipt> = { ...receipts, [c.id]: { sender, cost, delta: c.delta } };
    if (c.undoOf) nextReceipts[c.undoOf] = { ...undo!, undone: true };
    const ids = Object.keys(nextReceipts);
    for (const id of ids.slice(0, -800)) if (nextReceipts[id].delta) nextReceipts[id] = { ...nextReceipts[id], delta: undefined };
    const world = { ...withHouse(charged, c.lot, next), receipts: nextReceipts };
    if (JSON.stringify(world).length > 1800000) return fail('ワールドの保存量が上限に達したため、この変更を確定できません');
    return { world, result: { id: c.id, ok: true, cost }, changed: true };
  } catch (e) { return fail(e instanceof Error ? e.message : '変更できませんでした'); }
}

/** 時計と相場を進める。日付が変わったら true */
export function tickWorld(w: SharedWorld, dt: number, rng: () => number): { world: SharedWorld; newDay: boolean } {
  let { clock, day, market, marketHistory } = w.economy;
  clock += dt;
  if (clock < DAY_SECONDS) return { world: { ...w, economy: { ...w.economy, clock } }, newDay: false };
  clock -= DAY_SECONDS; day += 1; market = stepMarket(market, rng);
  marketHistory = [...marketHistory, market].slice(-60);
  let next: SharedWorld = { ...w, economy: { ...w.economy, clock, day, market, marketHistory } };
  next = collectRent(next);
  return { world: { ...next, economy: { ...next.economy, offers: sharedOffers(next, rng) } }, newDay: true };
}

/** 毎日の家賃。借りた人から持ち主へ。払えなければ退去になる */
export function collectRent(w: SharedWorld): SharedWorld {
  let out = w;
  for (const lot of w.economy.lots) {
    if (!lot.tenant || !lot.rentOffer || !lot.owner) continue;
    const paid = charge(out, lot.tenant, lot.rentOffer.rent, `家賃（${lot.name}）`);
    if (typeof paid === 'string') {
      out = { ...out, economy: { ...out.economy, lots: out.economy.lots.map(l => l.id === lot.id ? { ...l, tenant: undefined, tenantName: undefined } : l) } };
      continue;
    }
    const received = paid.accounts?.[lot.owner] ? charge(paid, lot.owner, -lot.rentOffer.rent, `家賃収入（${lot.name}・${lot.tenantName ?? ''}さん）`) : paid;
    out = typeof received === 'string' ? paid : received;
  }
  return out;
}

export function validSharedWorld(v: unknown): v is WorldSave {
  const w = v as WorldSave;
  return !!w && typeof w.worldId === 'string' && !!w.house && !!w.economy && Array.isArray(w.economy.lots) &&
    [w.economy.day, w.economy.clock, w.economy.market].every(Number.isFinite) && !!w.receipts && typeof w.receipts === 'object';
}
export const cloneWorld = copy;
