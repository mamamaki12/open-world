import { useGame } from '../state/store';
import { useEconomy } from '../state/economy';
import { useWardrobe } from '../state/wardrobe';
import { useVehicles, validCar } from '../state/vehicles';
import { sanitizeWardrobe } from '../catalog/clothes';
import { isHouse } from '../save/storage';
import { sessionGate, visitingWorld } from './gate';
import { readSave, writeSave } from './database';

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export function captureWorld() {
  const e = useEconomy.getState();
  return copy({ house: useGame.getState().house, receipts: sessionGate.receipts, economy: {
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
export interface Escrow { id: string; room: string; amount: number }
export interface SaveBundle { version: 1; savedAt: number; profile: GuestProfile; home: WorldSave; pending?: Escrow[] }
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
  return b.version === 1 && validWorld(b.home) && !!p && typeof p.id === 'string' && p.id.length < 100 &&
    typeof p.name === 'string' && p.name.length <= 24 && Number.isFinite(p.money) && Array.isArray(p.ledger) &&
    Array.isArray(p.cars) && p.cars.length <= 10 && p.cars.every(validCar) && !!p.wardrobe && Array.isArray(p.wardrobe.owned);
}
export function applyWorld(w: WorldSave, preserveSelection = false) {
  const previous = sessionGate.applying; sessionGate.applying = true;
  try {
    sessionGate.receipts = copy(w.receipts ?? {});
    const local = useEconomy.getState().currentLotId;
    const selected = preserveSelection && w.economy.lots.some(l => l.id === local) ? local : w.economy.currentLotId;
    const lots = w.economy.lots.map(l => l.id === w.economy.currentLotId ? { ...l, design: w.house } : l);
    const active = lots.find(l => l.id === selected);
    const house = selected === w.economy.currentLotId ? w.house : active?.design ?? active?.built ?? w.house;
    useEconomy.setState({ ...copy(w.economy), currentLotId: selected,
      lots: lots.map(l => l.id === selected ? { ...l, design: null } : l), job: null });
    useGame.setState({ house: copy(house), past: [], future: [], dragBase: null, selection: null, marked: [], lastCommit: null });
  } finally { sessionGate.applying = previous; }
}
export function applyProfile(p: GuestProfile) {
  useEconomy.setState({ money: p.money, ledger: copy(p.ledger), gamble: p.gamble });
  useWardrobe.setState(sanitizeWardrobe(p.wardrobe));
  useVehicles.setState({ cars: copy(p.cars), driving: null, target: null });
}
let bundle: SaveBundle;
let saving = Promise.resolve();
export const savedBundle = () => bundle;
export function snapshot(): SaveBundle {
  bundle = { ...bundle, version: 1, savedAt: Date.now(), profile: captureProfile(bundle.profile.id, bundle.profile.name),
    home: visitingWorld() ? bundle.home : captureWorld() };
  return copy(bundle);
}
export function persist(): Promise<void> {
  const data = snapshot();
  saving = saving.catch(() => undefined).then(() => writeSave(data));
  return saving;
}
export async function initializeSave() {
  const existing = await readSave<unknown>();
  if (existing !== undefined && !validBundle(existing)) throw new Error('保存データを読み込めません。元のデータは保持されています。');
  if (validBundle(existing)) { bundle = existing; applyWorld(bundle.home); applyProfile(bundle.profile); }
  else { bundle = { version: 1, savedAt: Date.now(), profile: captureProfile(crypto.randomUUID(), 'ゲスト'), home: captureWorld() }; }
  await persist();
}
export function renameGuest(name: string) { bundle.profile.name = name.trim().slice(0, 24) || 'ゲスト'; return persist(); }
export async function importSave(text: string) {
  const next: unknown = JSON.parse(text);
  if (!validBundle(next)) throw new Error('対応するバックアップではありません。');
  await writeSave(next); bundle = copy(next); applyWorld(bundle.home); applyProfile(bundle.profile);
}
export function downloadBackup() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot())], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'open-world-backup.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function restoreHome() {
  const personal = captureProfile(bundle.profile.id, bundle.profile.name);
  sessionGate.role = 'home'; applyWorld(bundle.home); applyProfile(personal);
  useGame.setState({ mode: 'build', tool: 'select', overlay: null });
}
