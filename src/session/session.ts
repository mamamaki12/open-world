import { create } from 'zustand';
import type { House } from '../building/types';
import { renovationCost } from '../economy/pricing';
import { useGame } from '../state/store';
import { useEconomy, currentPlotOf } from '../state/economy';
import { useWardrobe } from '../state/wardrobe';
import { useVehicles, validCar } from '../state/vehicles';
import { useDoors } from '../state/doors';
import { useVisit } from '../world/visit';
import { useVenue } from '../state/venue';
import { playerMemory } from '../world/Player';
import { plotX, plotZ } from '../economy/town';
import { applyChanges, changes } from './edits';
import type { Change } from './edits';
import { sessionGate } from './gate';
import { applyWorld, captureWorld, persist, restoreHome, savedBundle, validWorld } from './saves';
import type { WorldSave } from './saves';
import type { Outfit } from '../catalog/clothes';
import type { OwnedCar } from '../state/vehicles';

export interface Member { id: string; name: string; host: boolean; canBuild: boolean }
export interface RemotePose { x: number; y: number; z: number; yaw: number; outfit: Outfit; cars: OwnedCar[] }
interface SessionState {
  screen: 'menu' | 'game'; status: 'offline' | 'connecting' | 'connected' | 'reconnecting' | 'closed';
  role: 'home' | 'host' | 'guest'; code: string; message: string; members: Member[]; poses: Record<string, RemotePose>; busy: boolean;
}
export const useSession = create<SessionState>(() => ({ screen: 'menu', status: 'offline', role: 'home', code: '', message: '', members: [], poses: {}, busy: false }));
let socket: WebSocket | null = null, token = '', endpoint = '', reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let approvalQueue = Promise.resolve();
let intendedLeave = false, epoch = 0, remoteWorld: WorldSave | null = null;
const send = (data: unknown) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); };
interface Command { id: string; lot: string; delta: Change[]; reserved: number }
interface Result { id: string; ok: boolean; cost?: number; message?: string }
let pending: Command | null = null;
function currentWorldHouse(w: WorldSave, id: string): House | null {
  const l = w.economy.lots.find(l => l.id === id);
  return !l ? null : id === w.economy.currentLotId ? w.house : l.design ?? l.construction?.target ?? l.built;
}
function worldWithHouse(w: WorldSave, id: string, house: House): WorldSave {
  return { ...w, house: id === w.economy.currentLotId ? house : w.house, economy: { ...w.economy,
    lots: w.economy.lots.map(l => l.id === id ? { ...l, built: house, design: id === w.economy.currentLotId ? null : house, construction: null } : l) } };
}
function publishWorld() { send({ type: 'world', world: captureWorld() }); }
async function finish(result: Result) {
  const b = savedBundle(), escrow = b.pending?.find(p => p.id === result.id);
  if (!escrow) return;
  const refund = result.ok ? escrow.amount - (result.cost ?? escrow.amount) : escrow.amount;
  if (refund > 0) useEconomy.getState().receive(refund, result.ok ? '共同建築の精算' : '共同建築の取消');
  b.pending = b.pending?.filter(p => p.id !== result.id);
  pending = null; useSession.setState({ busy: false, message: result.ok ? '建築を確定しました' : result.message ?? '変更できませんでした' });
  await persist();
}
async function accept(sender: string, command: Command) {
  const answer = (r: Result) => sender === savedBundle().profile.id ? void finish(r) : send({ type: 'result', target: sender, result: r });
  try {
    if (!command || typeof command.id !== 'string' || command.id.length > 120) throw Error('操作IDが不正です');
    const prior = sessionGate.receipts[command.id];
    if (prior) { if (prior.sender !== sender) throw Error('操作IDが重複しました'); answer({ id: command.id, ok: true, cost: prior.cost }); return; }
    if (!useSession.getState().members.some(m => m.id === sender && m.canBuild)) throw Error('共同建築の許可が必要です');
    const w = captureWorld(), before = currentWorldHouse(w, command.lot);
    if (!before) throw Error('編集する土地がありません');
    if (w.economy.lots.find(l => l.id === command.lot)?.construction) throw Error('工事の完了後に編集してください');
    const next = applyChanges(before, command.delta), cost = renovationCost(before, next).total;
    if (!Number.isSafeInteger(command.reserved) || command.reserved < cost) throw Error('費用が変わりました。最新の状態でやり直してください');
    sessionGate.receipts[command.id] = { sender, cost };
    const updated = worldWithHouse(captureWorld(), command.lot, next);
    updated.receipts = sessionGate.receipts;
    applyWorld(updated, true);
    await persist(); // Persist the world and receipt before acknowledging payment.
    publishWorld(); answer({ id: command.id, ok: true, cost });
  } catch (e) { answer({ id: command?.id, ok: false, message: e instanceof Error ? e.message : '変更できませんでした' }); }
}
async function submit(before: House, after: House) {
  const s = useSession.getState(), me = savedBundle().profile.id;
  if (s.status !== 'connected' || !s.members.some(m => m.id === me && m.canBuild)) return useGame.getState().notify('ホストに共同建築の許可をもらってください');
  if (pending || s.busy) return useGame.getState().notify('前の変更を確定しています');
  const delta = changes(before, after); if (!delta.length) return;
  const cost = renovationCost(before, after).total;
  if (!Number.isSafeInteger(cost) || cost < 0 || !useEconomy.getState().pay(cost, '共同建築（確定待ち）')) return useGame.getState().notify('所持金が足りません');
  const id = crypto.randomUUID(), lot = useEconomy.getState().currentLotId;
  if (!lot) { useEconomy.getState().receive(cost, '共同建築の取消'); return; }
  pending = { id, lot, delta, reserved: cost }; useSession.setState({ busy: true });
  savedBundle().pending = [...(savedBundle().pending ?? []), { id, room: s.code, amount: cost }];
  try { await persist(); if (s.role === 'host') { const command = pending; approvalQueue = approvalQueue.then(() => accept(me, command)); } else send({ type: 'command', command: pending }); }
  catch { useSession.setState({ message: '保存に失敗しました。操作を確定できません', busy: false }); }
}
function endpointURL(value: string) {
  const u = new URL(value);
  if (!['ws:', 'wss:'].includes(u.protocol) || (location.protocol === 'https:' && u.protocol !== 'wss:')) throw Error('HTTPSの画面ではwss://の接続先を指定してください');
  return u.href;
}
export async function enterOffline() { sessionGate.role = 'home'; await persist(); useSession.setState({ screen: 'game', role: 'home', status: 'offline', message: '' }); }
export async function connectWorld(url: string, code = '') {
  if (!navigator.onLine) throw Error('友達と遊ぶには通信が必要です');
  endpoint = endpointURL(url); await persist();
  intendedLeave = false; token = ''; remoteWorld = null;
  sessionGate.role = code ? 'guest' : 'host';
  useSession.setState({ role: sessionGate.role, status: 'connecting', code: code.toUpperCase(), message: '', members: [], poses: {} });
  openConnection(++epoch, false);
}
function openConnection(generation: number, resume: boolean) {
  const p = savedBundle().profile, state = useSession.getState();
  socket = new WebSocket(endpoint);
  socket.onopen = () => send({ type: resume ? 'resume' : state.role === 'host' ? 'create' : 'join', id: p.id, name: p.name, code: state.code, token });
  socket.onmessage = async event => {
    if (generation !== epoch) return;
    try {
      const m = JSON.parse(event.data);
      if (m.type === 'welcome') {
        token = m.token;
        useSession.setState({ code: m.code, screen: 'game', status: 'connected' });
        sessionGate.edit = (a, b) => { void submit(a, b); };
        if (state.role === 'host') publishWorld();
        if (pending) send({ type: 'command', command: pending });
      } else if (m.type === 'world' && state.role === 'guest') {
        if (!validWorld(m.world)) throw Error('ワールドを読み込めません');
        remoteWorld = m.world;
        if (!useGame.getState().dragBase) applyWorld(remoteWorld!, true);
        for (const escrow of savedBundle().pending ?? []) {
          const receipt = m.world.receipts?.[escrow.id];
          if (receipt?.sender === p.id) await finish({ id: escrow.id, ok: true, cost: receipt.cost });
        }
      } else if (m.type === 'members') {
        useSession.setState({ members: m.members, poses: Object.fromEntries(Object.entries(useSession.getState().poses).filter(([id]) => m.members.some((x: Member) => x.id === id))) });
      } else if (m.type === 'command' && state.role === 'host') approvalQueue = approvalQueue.then(() => accept(m.sender, m.command));
      else if (m.type === 'result') await finish(m.result);
      else if (m.type === 'denied') await finish({ id: m.id, ok: false, message: m.message });
      else if (m.type === 'pose' && validPose(m.pose)) useSession.setState(s => ({ poses: { ...s.poses, [m.sender]: m.pose } }));
      else if (m.type === 'door' && typeof m.id === 'string' && [0, 1, -1].includes(m.dir)) {
        const open = { ...useDoors.getState().open }; if (m.dir) open[m.id] = m.dir; else delete open[m.id];
        sessionGate.applying = true; useDoors.setState({ open }); sessionGate.applying = false;
      } else if (m.type === 'paused') useSession.setState({ status: 'reconnecting', message: m.message });
      else if (m.type === 'resumed') useSession.setState({ status: 'connected', message: '' });
      else if (m.type === 'closed' || m.type === 'error') { useSession.setState({ status: 'closed', message: m.message }); intendedLeave = true; }
    } catch (e) { useSession.setState({ message: e instanceof Error ? e.message : '通信内容を読み込めません' }); }
  };
  socket.onerror = () => useSession.setState({ message: '接続できません。接続先と通信状態を確認してください' });
  socket.onclose = () => {
    if (intendedLeave || generation !== epoch) return;
    if (!token) { useSession.setState({ status: 'closed' }); return; }
    useSession.setState({ status: 'reconnecting', message: '再接続しています。建築は一時停止中です' });
    reconnectTimer = setTimeout(() => openConnection(generation, true), 1500);
  };
}
function validPose(p: RemotePose) { return !!p && [p.x, p.y, p.z, p.yaw].every(v => Number.isFinite(v) && Math.abs(v) < 10000) && !!p.outfit && Array.isArray(p.cars) && p.cars.length <= 10 && p.cars.every(validCar); }
export function allowBuilding(id: string, canBuild: boolean) { send({ type: 'permission', target: id, canBuild }); }
export async function leaveWorld() {
  if (useSession.getState().busy) { useSession.setState({ message: '建築費の精算待ちです。接続の復帰後に退出してください' }); return; }
  await persist(); intendedLeave = true; ++epoch; clearTimeout(reconnectTimer); send({ type: 'leave' }); socket?.close(); socket = null;
  sessionGate.edit = null; restoreHome(); useDoors.getState().closeAll(); useVisit.setState({ plot: null }); useVenue.setState({ inside: null });
  useSession.setState({ screen: 'menu', role: 'home', status: 'offline', code: '', members: [], poses: {}, message: '' }); await persist();
}
/** Install once outside React effects; subscriptions never outlive the page. */
export function startSessionTimers() {
  let wasDriving: string | null = null;
  const pose = setInterval(() => {
    const s = useSession.getState(); if (s.status !== 'connected') return;
    const plot = currentPlotOf(useEconomy.getState()), p = playerMemory;
    send({ type: 'pose', pose: { x: p.x + plotX(plot), y: p.y, z: p.z + plotZ(plot), yaw: p.yaw,
      outfit: useWardrobe.getState().outfit, cars: useVehicles.getState().cars } });
    const driving = useVehicles.getState().driving;
    if (driving !== wasDriving) { wasDriving = driving; void persist(); }
  }, 100);
  const save = setInterval(() => { void persist().catch(() => useSession.setState({ message: '端末への保存に失敗しました。バックアップを保存してください' })); }, 2000);
  const doors = useDoors.subscribe((s, prev) => {
    if (sessionGate.applying || useSession.getState().status !== 'connected' || s.open === prev.open) return;
    for (const id of new Set([...Object.keys(prev.open), ...Object.keys(s.open)])) if (s.open[id] !== prev.open[id]) send({ type: 'door', id, dir: s.open[id] ?? 0 });
  });
  const hide = () => { if (document.hidden) void persist(); }; document.addEventListener('visibilitychange', hide);
  return () => { clearInterval(pose); clearInterval(save); doors(); document.removeEventListener('visibilitychange', hide); };
}
