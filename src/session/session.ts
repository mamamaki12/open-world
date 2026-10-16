import { create } from 'zustand';
import type { House } from '../building/types';
import { useGame } from '../state/store';
import { useEconomy, currentPlotOf, lotCells } from '../state/economy';
import { lotSize } from '../building/dimensions';
import { useWardrobe } from '../state/wardrobe';
import { useVehicles, validCar } from '../state/vehicles';
import { useDoors } from '../state/doors';
import { useVisit } from '../world/visit';
import { useVenue, autoVenueDoors } from '../state/venue';
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
export interface RemotePose { x: number; y: number; z: number; yaw: number; outfit: Outfit; cars: OwnedCar[]; driving?: string | null }
interface SessionState {
  screen: 'menu' | 'game'; status: 'offline' | 'connecting' | 'connected' | 'reconnecting' | 'closed';
  role: 'home' | 'host' | 'guest'; shared: boolean; code: string; message: string; members: Member[]; poses: Record<string, RemotePose>; busy: boolean;
}
export const useSession = create<SessionState>(() => ({ screen: 'menu', status: 'offline', role: 'home', shared: false, code: '', message: '', members: [], poses: {}, busy: false }));
let socket: WebSocket | null = null, token = '', endpoint = '', reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let approvalQueue = Promise.resolve();
let approving = false;
let intendedLeave = false, epoch = 0, remoteWorld: WorldSave | null = null;
const send = (data: unknown) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); };
export const currentEndpoint = () => endpoint;
interface Command { id: string; lot: string; delta: Change[]; reserved: number; settle?: boolean; undoOf?: string }
interface Result { id: string; ok: boolean; cost?: number; message?: string }
let pending: Command | null = null;
const ownHistory: Command[] = [];
const syncHistory = () => { if (sessionGate.edit) useGame.setState({ past: ownHistory.map(() => useGame.getState().house), future: [] }); };
function currentWorldHouse(w: WorldSave, id: string): House | null {
  const l = w.economy.lots.find(l => l.id === id);
  return !l ? null : id === w.economy.currentLotId ? w.house : l.design ?? l.construction?.target ?? l.built;
}
function worldWithHouse(w: WorldSave, id: string, house: House): WorldSave {
  return { ...w, house: id === w.economy.currentLotId ? house : w.house, economy: { ...w.economy,
    lots: w.economy.lots.map(l => l.id === id ? { ...l, built: house, design: id === w.economy.currentLotId ? null : house, construction: null } : l) } };
}
function publishWorld() { if (!approving) send({ type: 'world', world: captureWorld() }); }
async function finish(result: Result) {
  const b = savedBundle(), escrow = b.pending?.find(p => p.id === result.id);
  if (!escrow) return;
  const refund = result.ok ? escrow.amount - (result.cost ?? escrow.amount) : escrow.amount;
  if (refund > 0) useEconomy.getState().receive(refund, result.ok ? '共同建築の精算' : '共同建築の取消');
  b.pending = b.pending?.filter(p => p.id !== result.id);
  if (result.ok && pending?.id === result.id) {
    if (pending.undoOf) { const i = ownHistory.findIndex(c => c.id === pending!.undoOf); if (i >= 0) ownHistory.splice(i, 1); }
    else { ownHistory.push(pending); if (ownHistory.length > 100) ownHistory.shift(); }
  }
  pending = null; useSession.setState({ busy: false, message: result.ok ? '建築を確定しました' : result.message ?? '変更できませんでした' });
  if (sessionGate.role === 'guest' && remoteWorld && !useGame.getState().dragBase) applyWorld(remoteWorld, true);
  syncHistory();
  await persist();
}
async function accept(sender: string, command: Command) {
  const answer = (r: Result) => sender === savedBundle().profile.id ? void finish(r) : send({ type: 'result', target: sender, result: r });
  let rollback: WorldSave | null = null;
  try {
    if (!command || typeof command.id !== 'string' || command.id.length > 120) throw Error('操作IDが不正です');
    const prior = sessionGate.receipts[command.id];
    if (prior) { if (prior.sender !== sender) throw Error('操作IDが重複しました'); answer({ id: command.id, ok: true, cost: prior.cost }); return; }
    if (command.settle) { answer({ id: command.id, ok: false, message: '未確定だった建築費を返しました' }); return; }
    if (!useSession.getState().members.some(m => m.id === sender && m.canBuild)) throw Error('共同建築の許可が必要です');
    const w = captureWorld(), before = currentWorldHouse(w, command.lot);
    if (!before) throw Error('編集する土地がありません');
    if (w.economy.lots.find(l => l.id === command.lot)?.construction) throw Error('工事の完了後に編集してください');
    const undo = command.undoOf ? sessionGate.receipts[command.undoOf] : null;
    if (command.undoOf && (!undo || undo.sender !== sender || undo.undone ||
      JSON.stringify(undo.delta?.map(c => ({ ...c, before: c.after, after: c.before }))) !== JSON.stringify(command.delta))) throw Error('自分の操作だけを一度ずつ戻せます');
    let next: House, cost: number;
    const previousSize = { ...lotSize }, target = w.economy.lots.find(l => l.id === command.lot)!;
    try { Object.assign(lotSize, lotCells(target)); next = applyChanges(before, command.delta); cost = 0; }
    finally { Object.assign(lotSize, previousSize); }
    if (!Number.isSafeInteger(command.reserved) || command.reserved < cost) throw Error('費用が変わりました。最新の状態でやり直してください');
    rollback = captureWorld(); approving = true;
    if (undo) undo.undone = true;
    sessionGate.receipts[command.id] = { sender, cost, delta: command.delta };
    const receipts = Object.keys(sessionGate.receipts);
    for (const id of receipts.slice(0, -800)) delete sessionGate.receipts[id].delta;
    const updated = worldWithHouse(captureWorld(), command.lot, next);
    updated.receipts = sessionGate.receipts;
    if (JSON.stringify(updated).length > 1800000) throw Error('ワールドの保存量が上限に達したため、この変更を確定できません');
    applyWorld(updated, true);
    syncHistory();
    await persist(); // Persist the world and receipt before acknowledging payment.
    approving = false;
    publishWorld(); answer({ id: command.id, ok: true, cost });
  } catch (e) {
    if (rollback) { applyWorld(rollback, true); syncHistory(); void persist().catch(() => undefined); }
    answer({ id: command?.id, ok: false, message: e instanceof Error ? e.message : '変更できませんでした' });
  } finally { approving = false; }
}
async function undoOwnEdit() {
  const original = ownHistory[ownHistory.length - 1], s = useSession.getState();
  if (!original || pending || s.busy || s.status !== 'connected') return;
  const command: Command = { id: crypto.randomUUID(), lot: original.lot, delta: original.delta.map(c => ({ ...c, before: c.after, after: c.before })), reserved: 0, undoOf: original.id };
  pending = command; useSession.setState({ busy: true });
  savedBundle().pending = [...(savedBundle().pending ?? []), { id: command.id, room: s.code, worldId: sessionGate.worldId, amount: 0 }];
  try { await persist();
    if (s.role === 'host') approvalQueue = approvalQueue.then(() => accept(savedBundle().profile.id, command));
    else send({ type: 'command', command });
  } catch { await finish({ id: command.id, ok: false, message: '保存できないため操作を取り消しました' }).catch(() => undefined); }
}
async function submit(before: House, after: House) {
  const s = useSession.getState(), me = savedBundle().profile.id;
  if (s.status !== 'connected' || !s.members.some(m => m.id === me && m.canBuild)) return useGame.getState().notify('ホストに共同建築の許可をもらってください');
  if (pending || s.busy) return useGame.getState().notify('前の変更を確定しています');
  const delta = changes(before, after); if (!delta.length) return;
  // 着工は無料（ひとりモードと同じ）
  const cost = 0;
  if (!Number.isSafeInteger(cost) || cost < 0 || (cost > 0 && !useEconomy.getState().pay(cost, '共同建築（確定待ち）'))) return useGame.getState().notify('所持金が足りません');
  const id = crypto.randomUUID(), lot = useEconomy.getState().currentLotId;
  if (!lot) { useEconomy.getState().receive(cost, '共同建築の取消'); return; }
  pending = { id, lot, delta, reserved: cost }; useSession.setState({ busy: true });
  savedBundle().pending = [...(savedBundle().pending ?? []), { id, room: s.code, worldId: sessionGate.worldId, amount: cost }];
  try { await persist(); if (s.role === 'host') { const command = pending; approvalQueue = approvalQueue.then(() => accept(me, command)); } else send({ type: 'command', command: pending }); }
  catch { await finish({ id, ok: false, message: '保存できないため操作を取り消しました' }).catch(() => undefined); }
}
function endpointURL(value: string) {
  const u = new URL(value);
  if (!['ws:', 'wss:'].includes(u.protocol) || (location.protocol === 'https:' && u.protocol !== 'wss:')) throw Error('HTTPSの画面ではwss://の接続先を指定してください');
  return u.href;
}
export async function enterOffline() {
  intendedLeave = true; ++epoch; clearTimeout(reconnectTimer); socket?.close(); socket = null;
  if ((sessionGate.role === 'guest' && remoteWorld) || sessionGate.shared) restoreHome();
  leaveShared(); sessionGate.role = 'home'; sessionGate.edit = null; sessionGate.undo = null;
  await persist(); useSession.setState({ screen: 'game', role: 'home', shared: false, status: 'offline', message: '', members: [], poses: {}, code: '' });
}
/** みんなのワールド（サーバーが正本を持つ1つの町）に入る。自宅は訪問中と同じく上書きしない */
export async function joinShared(url: string) {
  await persist(); // 自分のワールドの所持金・車を保存してから切り替える
  sessionGate.shared = true; inflight.clear(); account = null;
  sessionGate.money = (delta, label) => {
    if (accountApplying || !delta || useSession.getState().status !== 'connected') return;
    const id = crypto.randomUUID(); inflight.set(id, delta);
    send({ type: 'command', command: { id, lot: '', delta: [], reserved: 0, action: { type: 'money', delta, label } } });
  };
  sessionGate.act = (lot, action, reserved) => {
    if (useSession.getState().status !== 'connected') return '接続を待っています';
    const id = crypto.randomUUID(); actions.add(id);
    send({ type: 'command', command: { id, lot, delta: [], reserved, action } });
    return null;
  };
  useEconomy.setState({ money: 0, ledger: [] }); useVehicles.setState({ cars: [], driving: null, target: null });
  try { await connectWorld(url, '', true); } catch (e) { restoreHome(); leaveShared(); throw e; }
}
/** みんなのワールドの口座（サーバーの正本）に、まだ返事のない自分の出入りを足して表示する */
const inflight = new Map<string, number>(), actions = new Set<string>();
let account: { money: number; ledger: { day: number; label: string; amount: number }[]; cars: unknown[] } | null = null, accountApplying = false;
function showAccount() {
  if (!account) return;
  accountApplying = true;
  try {
    const money = account.money + [...inflight.values()].reduce((a, b) => a + b, 0);
    useEconomy.setState({ money, ledger: account.ledger });
    const cars = account.cars.filter(validCar);
    if (JSON.stringify(cars) !== JSON.stringify(useVehicles.getState().cars)) useVehicles.setState({ cars });
  } finally { accountApplying = false; }
}
function leaveShared() { sessionGate.shared = false; sessionGate.money = null; sessionGate.act = null; inflight.clear(); actions.clear(); account = null; }
export async function connectWorld(url: string, code = '', shared = false) {
  if (!navigator.onLine) throw Error('みんなと遊ぶには通信が必要です');
  endpoint = endpointURL(url); await persist();
  intendedLeave = false; token = ''; remoteWorld = null;
  sessionGate.role = code || shared ? 'guest' : 'host';
  useSession.setState({ role: sessionGate.role, shared, status: 'connecting', code: code.toUpperCase(), message: '', members: [], poses: {} });
  openConnection(++epoch, false);
}
function openConnection(generation: number, resume: boolean) {
  const p = savedBundle().profile, state = useSession.getState();
  socket = new WebSocket(endpoint);
  socket.onopen = () => send({ type: state.shared ? 'shared' : resume ? 'resume' : state.role === 'host' ? 'create' : 'join', id: p.id, name: p.name, code: state.code, token });
  socket.onmessage = async event => {
    if (generation !== epoch) return;
    try {
      const m = JSON.parse(event.data);
      if (m.type === 'welcome') {
        token = m.token;
        useSession.setState({ code: m.code, screen: 'game', status: 'connected' });
        sessionGate.edit = (a, b) => { void submit(a, b); };
        sessionGate.undo = () => { void undoOwnEdit(); };
        if (state.role === 'host') publishWorld();
        if (pending) send({ type: 'command', command: pending });
      } else if (m.type === 'world' && state.role === 'guest') {
        if (!validWorld(m.world)) throw Error('ワールドを読み込めません');
        remoteWorld = m.world;
        if (!useGame.getState().dragBase) applyWorld(remoteWorld!, true);
        syncHistory();
        for (const escrow of savedBundle().pending ?? []) {
          const receipt = m.world.receipts?.[escrow.id];
          if (receipt?.sender === p.id) await finish(receipt.cancelled ? { id: escrow.id, ok: false, message: '未確定だった建築費を返しました' } : { id: escrow.id, ok: true, cost: receipt.cost });
          else if (escrow.worldId === m.world.worldId && escrow.id !== pending?.id) send({ type: 'settle', id: escrow.id });
        }
      } else if (m.type === 'members') {
        useSession.setState({ members: m.members, poses: Object.fromEntries(Object.entries(useSession.getState().poses).filter(([id]) => m.members.some((x: Member) => x.id === id))) });
        if (state.role === 'host') publishWorld();
      } else if (m.type === 'command' && state.role === 'host') approvalQueue = approvalQueue.then(() => accept(m.sender, m.command));
      else if (m.type === 'result' && (inflight.has(m.result?.id) || actions.has(m.result?.id))) {
        const id = m.result.id; inflight.delete(id);
        if (actions.delete(id)) useGame.getState().notify(m.result.ok ? m.result.message || '完了しました' : m.result.message || 'できませんでした');
        showAccount();
      }
      else if (m.type === 'account' && m.account && Number.isFinite(m.account.money)) { account = m.account; showAccount(); }
      else if (m.type === 'result') await finish(m.result);
      else if (m.type === 'denied') await finish({ id: m.id, ok: false, message: m.message });
      else if (m.type === 'pose' && validPose(m.pose)) useSession.setState(s => ({ poses: { ...s.poses, [m.sender]: m.pose } }));
      else if (m.type === 'clock' && state.role === 'guest' && [m.clock?.day, m.clock?.clock, m.clock?.market].every(Number.isFinite)) {
        useEconomy.setState({ day: m.clock.day, clock: m.clock.clock, market: m.clock.market, marketHistory: m.clock.marketHistory });
      }
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
  if (useSession.getState().busy && useSession.getState().status !== 'closed') { useSession.setState({ message: '建築費の精算待ちです。接続の復帰後に退出してください' }); return; }
  await persist(); intendedLeave = true; ++epoch; clearTimeout(reconnectTimer); send({ type: 'leave' }); socket?.close(); socket = null;
  sessionGate.edit = null; sessionGate.undo = null; ownHistory.length = 0; restoreHome(); leaveShared();
  useDoors.setState({ target: null, climb: null, climbing: false }); useVisit.setState({ plot: null }); useVenue.setState({ inside: null });
  pending = null;
  useSession.setState({ screen: 'menu', role: 'home', shared: false, status: 'offline', code: '', members: [], poses: {}, message: '', busy: false }); await persist();
}
/** Install once outside React effects; subscriptions never outlive the page. */
export function startSessionTimers() {
  let wasDriving: string | null = null;
  let lastLots = '';
  sessionGate.visitors = () => { const p = currentPlotOf(useEconomy.getState()); return Object.values(useSession.getState().poses).map(q => ({ x: q.x - plotX(p), y: q.y, z: q.z - plotZ(p) })); };
  const pose = setInterval(() => {
    const s = useSession.getState(); if (s.status !== 'connected') return;
    const plot = currentPlotOf(useEconomy.getState()), p = playerMemory;
    send({ type: 'pose', pose: { x: p.x + plotX(plot), y: p.y, z: p.z + plotZ(plot), yaw: p.yaw,
      outfit: useWardrobe.getState().outfit, cars: useVehicles.getState().cars, driving: useVehicles.getState().driving } });
    if (s.role === 'host') autoVenueDoors(p, useGame.getState().mode === 'walk');
    const driving = useVehicles.getState().driving;
    if (driving !== wasDriving) { wasDriving = driving; void persist(); }
  }, 100);
  const save = setInterval(() => {
    if (useSession.getState().role === 'host' && useSession.getState().status === 'connected') {
      const e = useEconomy.getState(), lots = JSON.stringify(e.lots.map(l => [l.id, l.built, l.construction]));
      if (lots !== lastLots) { lastLots = lots; publishWorld(); }
      send({ type: 'clock', clock: { day: e.day, clock: e.clock, market: e.market, marketHistory: e.marketHistory } });
    }
    void persist().catch(() => useSession.setState({ message: '端末への保存に失敗しました。バックアップを保存してください' }));
  }, 2000);
  const cars = useVehicles.subscribe((s, prev) => {
    if (!sessionGate.shared || accountApplying || s.cars === prev.cars || useSession.getState().status !== 'connected') return;
    send({ type: 'command', command: { id: crypto.randomUUID(), lot: '', delta: [], reserved: 0, action: { type: 'cars', cars: s.cars } } });
  });
  const doors = useDoors.subscribe((s, prev) => {
    if (sessionGate.applying || useSession.getState().status !== 'connected' || s.open === prev.open) return;
    for (const id of new Set([...Object.keys(prev.open), ...Object.keys(s.open)])) if (s.open[id] !== prev.open[id]) send({ type: 'door', id, dir: s.open[id] ?? 0 });
  });
  const edits = useGame.subscribe((s, prev) => {
    if (!sessionGate.applying && s.house !== prev.house && !s.dragBase) void persist().catch(() => undefined);
  });
  const hide = () => { if (document.hidden) void persist(); }; document.addEventListener('visibilitychange', hide);
  return () => { cars(); clearInterval(pose); clearInterval(save); doors(); edits(); document.removeEventListener('visibilitychange', hide); };
}
