import { useGame } from '../state/store';
import { useEconomy } from '../state/economy';
import { useWardrobe } from '../state/wardrobe';
import { useVehicles, validCar } from '../state/vehicles';
import { sanitizeWardrobe } from '../catalog/clothes';
import { isHouse } from '../save/storage';
import { emptyHouse } from '../building/types';
import { sessionGate, visitingWorld } from './gate';
import { useDoors } from '../state/doors';
import { cleanMods } from '../catalog/carMods';
import { readSave, writeSave } from './database';
import { validWallet } from './wallet';
import type { WalletSync } from './wallet';
import { restoreLooks, useLooks } from '../state/looks';
import type { Looks } from '../catalog/looks';
import { homeHoldings, restoreHomeHoldings, useStocks } from '../state/stocks';
import { validHoldings } from '../economy/stocks';
import type { Holding } from '../economy/stocks';
import { restoreDesigns, sanitizeDesign, useDesigns } from '../catalog/designs';
import type { FurnitureDef } from '../catalog';

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export function captureWorld() {
  const e = useEconomy.getState();
  return copy({ worldId: sessionGate.worldId, doors: useDoors.getState().open, house: useGame.getState().house, receipts: sessionGate.receipts, economy: {
    day: e.day, clock: e.clock, market: e.market, marketHistory: e.marketHistory,
    lots: e.lots, currentLotId: e.currentLotId, offers: e.offers,
  }});
}
export type WorldSave = ReturnType<typeof captureWorld>;
export function captureProfile(id: string, name: string) {
  const e = useEconomy.getState(), w = useWardrobe.getState();
  return copy({ id, name, money: e.money, ledger: e.ledger, gamble: e.gamble,
    wardrobe: { owned: w.owned, outfit: w.outfit }, cars: useVehicles.getState().cars });
}
export type GuestProfile = ReturnType<typeof captureProfile>;
export interface Escrow { id: string; room: string; worldId: string; amount: number }
export interface SaveBundle {
  version: 1; savedAt: number; profile: GuestProfile; home: WorldSave; pending?: Escrow[]; wallet?: WalletSync;
  /** 個人共通のデータ。旧version1バックアップでは省略される。 */
  appearance?: { looks: Looks; created: boolean }; holdings?: Record<string, Holding>; designs?: FurnitureDef[];
}
export function validWorld(v: unknown): v is WorldSave {
  if (!v || typeof v !== 'object') return false;
  const w = v as WorldSave, e = w.economy;
  return isHouse(w.house) && !!e && Array.isArray(e.lots) && e.lots.length <= 100 &&
    e.lots.every(l => !!l && typeof l.id === 'string' && (l.built === null || isHouse(l.built)) &&
      (l.design === null || isHouse(l.design)) && (!l.construction || isHouse(l.construction.target))) &&
    [e.day, e.clock, e.market].every(Number.isFinite) && Array.isArray(e.offers) && Array.isArray(e.marketHistory) &&
    (e.currentLotId === null || e.lots.some(l => l.id === e.currentLotId));
}
export function validBundle(v: unknown): v is SaveBundle {
  if (!v || typeof v !== 'object') return false;
  const b = v as SaveBundle, p = b.profile;
  return b.version === 1 && (b.wallet === undefined || validWallet(b.wallet)) && validWorld(b.home) && !!p && typeof p.id === 'string' && p.id.length < 100 &&
    (b.holdings === undefined || validHoldings(b.holdings)) &&
    (b.appearance === undefined || !!b.appearance && typeof b.appearance.created === 'boolean' && !!b.appearance.looks && typeof b.appearance.looks === 'object') &&
    (b.designs === undefined || Array.isArray(b.designs) && b.designs.every(d => !!sanitizeDesign(d))) &&
    typeof p.name === 'string' && p.name.length <= 24 && Number.isFinite(p.money) && Array.isArray(p.ledger) &&
    Array.isArray(p.cars) && p.cars.length <= 10 && p.cars.every(validCar) && !!p.wardrobe && Array.isArray(p.wardrobe.owned);
}
export function applyWorld(w: WorldSave, preserveSelection = false) {
  const previous = sessionGate.applying; sessionGate.applying = true;
  try {
    sessionGate.receipts = copy(w.receipts ?? {});
    sessionGate.worldId = w.worldId || crypto.randomUUID();
    useDoors.setState({ open: copy(w.doors ?? {}) });
    const local = useEconomy.getState().currentLotId;
    const selected = preserveSelection && w.economy.lots.some(l => l.id === local) ? local : w.economy.currentLotId;
    const lots = w.economy.lots.map(l => l.id === w.economy.currentLotId ? { ...l, design: w.house } : l);
    const active = lots.find(l => l.id === selected);
    const house = selected === w.economy.currentLotId ? w.house : active ? active.design ?? active.built ?? emptyHouse() : w.house;
    useEconomy.setState({ ...copy(w.economy), currentLotId: selected,
      lots: lots.map(l => l.id === selected ? { ...l, design: null } : l) });
    useGame.setState({ house: copy(house), past: [], future: [], dragBase: null, selection: null, marked: [], lastCommit: null });
  } finally { sessionGate.applying = previous; }
}
export function applyProfile(p: GuestProfile) {
  const previous = sessionGate.applying; sessionGate.applying = true;
  try {
  useEconomy.setState({ money: p.money, ledger: copy(p.ledger), gamble: p.gamble });
  useWardrobe.setState(sanitizeWardrobe(p.wardrobe));
  useVehicles.setState({ cars: copy(p.cars).map(c => ({ ...c, mods: cleanMods(c.mods) })), driving: null, target: null, riding: null });
  } finally { sessionGate.applying = previous; }
}
let bundle: SaveBundle;
let saving = Promise.resolve();
let importing = false;
export const savedBundle = () => bundle;
export function snapshot(): SaveBundle {
  bundle = { ...bundle, version: 1, savedAt: Date.now(), profile: personalProfile(),
    home: visitingWorld() ? bundle.home : captureWorld(),
    appearance: { looks: useLooks.getState().looks, created: useLooks.getState().created },
    holdings: sessionGate.shared ? homeHoldings() : useStocks.getState().holdings,
    designs: useDesigns.getState().designs };
  return copy(bundle);
}
export function persist(): Promise<void> {
  if (sessionGate.superseded) return Promise.resolve();
  // 復元前の状態を予約して、復元後に上書きすることを防ぐ。
  if (importing) return saving.catch(() => undefined).then(() => persist());
  const data = snapshot();
  saving = saving.catch(() => undefined).then(() => sessionGate.superseded ? undefined : writeSave(data));
  return saving;
}
export async function initializeSave() {
  sessionGate.worldId = crypto.randomUUID();
  const existing = await readSave<unknown>();
  if (existing !== undefined && !validBundle(existing)) throw new Error('保存データを読み込めません。元のデータは保持されています。');
  if (validBundle(existing)) { bundle = existing; applyWorld(bundle.home); applyProfile(bundle.profile); applyPersonalData(bundle); }
  else { bundle = { version: 1, savedAt: Date.now(), profile: captureProfile(crypto.randomUUID(), 'ゲスト'), home: captureWorld() }; }
  // A host's own escrow and authoritative world are saved atomically in the same record.
  bundle.pending = bundle.pending?.filter(p => {
    if (p.worldId !== bundle.home.worldId) return true;
    const receipt = bundle.home.receipts?.[p.id];
    const refund = receipt?.sender === bundle.profile.id ? p.amount - receipt.cost : p.amount;
    if (refund > 0) useEconomy.getState().receive(refund, '建築費の復旧精算');
    return false;
  });
  await persist();
}
export function renameGuest(name: string) { bundle.profile.name = name.trim().slice(0, 24) || 'ゲスト'; return persist(); }
export async function importSave(text: string) {
  if (importing) throw new Error('バックアップを復元中です。少し待ってください。');
  const next: unknown = JSON.parse(text);
  if (!validBundle(next)) throw new Error('対応するバックアップではありません。');
  importing = true;
  const operation = saving.catch(() => undefined).then(async () => {
    await writeSave(next);
    bundle = copy(next); applyWorld(bundle.home); applyProfile(bundle.profile); applyPersonalData(bundle);
  });
  saving = operation;
  try { await operation; } finally { importing = false; }
}
function applyPersonalData(b: SaveBundle) {
  if (b.appearance) restoreLooks(b.appearance.looks, b.appearance.created);
  if (b.holdings) restoreHomeHoldings(b.holdings);
  if (b.designs) restoreDesigns(b.designs);
}
export function downloadBackup() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot())], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'open-world-backup.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** 所持金と服は共通。共有ワールドの車は個別ワールドへ持ち込まない。 */
function personalProfile(): GuestProfile {
  const now = captureProfile(bundle.profile.id, bundle.profile.name);
  return sessionGate.shared ? { ...copy(bundle.profile), money: now.money, ledger: now.ledger, wardrobe: now.wardrobe } : now;
}
export function restoreHome() {
  const personal = personalProfile();
  sessionGate.role = 'home'; applyWorld(bundle.home); applyProfile(personal);
  useGame.setState({ mode: 'build', tool: 'select', overlay: null });
}
