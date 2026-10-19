import { create } from 'zustand';
import type { House } from '../building/types';
import { useGame } from '../state/store';
import { useEconomy, currentPlotOf, lotCells, civicOffset } from '../state/economy';
import { VENUES, VENUE_DOORS } from '../building/venues';
import { startWallet, settleWallet, walletMoney } from './wallet';
import { lotSize } from '../building/dimensions';
import { useWardrobe } from '../state/wardrobe';
import { useLooks } from '../state/looks';
import type { Looks } from '../catalog/looks';
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
import { useStocks, homeHoldings } from '../state/stocks';
import type { Holding } from '../economy/stocks';
import { recordPose, forgetPose } from './poseBuffer';

export interface Member { id: string; name: string; host: boolean; canBuild: boolean }
export interface RemotePose { x: number; y: number; z: number; yaw: number; outfit: Outfit; looks?: Looks; cars: OwnedCar[]; driving?: string | null; walking?: boolean; riding?: string | null; /** 送った側の performance.now()。受け取り側の補間に使う */ ts?: number }
interface SessionState {
  screen: 'menu' | 'game'; status: 'offline' | 'connecting' | 'connected' | 'reconnecting' | 'closed';
  role: 'home' | 'host' | 'guest'; shared: boolean; code: string; message: string; members: Member[]; poses: Record<string, RemotePose>; busy: boolean; replaced: boolean;
}
export const useSession = create<SessionState>(() => ({ screen: 'menu', status: 'offline', role: 'home', shared: false, code: '', message: '', members: [], poses: {}, busy: false, replaced: false }));
let socket: WebSocket | null = null, token = '', endpoint = '', reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let approvalQueue = Promise.resolve();
let approving = false;
let intendedLeave = false, epoch = 0, remoteWorld: WorldSave | null = null;
let sharedSpawn = false, homePosition: typeof playerMemory | null = null;
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
  if (!result.ok) useGame.getState().notify(result.message ?? '変更できませんでした');
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
  if (s.status !== 'connected') return useGame.getState().notify('接続が戻ってから建築してください');
  if (!s.members.some(m => m.id === me && m.canBuild)) return useGame.getState().notify('ホストに共同建築の許可をもらってください');
  if (pending || s.busy) return useGame.getState().notify('前の変更を確定しています');
  const delta = changes(before, after); if (!delta.length) return;
  // 着工は無料（ひとりモードと同じ）
  const cost = 0;
  if (!Number.isSafeInteger(cost) || cost < 0 || (cost > 0 && !useEconomy.getState().pay(cost, '共同建築（確定待ち）'))) return useGame.getState().notify('所持金が足りません');
  const id = crypto.randomUUID(), lot = useEconomy.getState().currentLotId;
  if (!lot) { useEconomy.getState().receive(cost, '共同建築の取消'); useGame.getState().notify('先に不動産屋で土地を購入してください'); return; }
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
  homePosition = { ...playerMemory }; sharedSpawn = true;
  sessionGate.shared = true; walletSending = null; account = null;
  sessionGate.money = null; // The economy subscription journals all money changes, including offline ticking.
  sessionGate.act = (lot, action, reserved) => {
    if (!account || savedBundle().wallet?.pending.length) return '所持金を同期中です。少し待ってからお試しください';
    if (useSession.getState().status !== 'connected') return '接続を待っています';
    const id = crypto.randomUUID(); actions.add(id);
    send({ type: 'command', command: { id, lot, delta: [], reserved, action } });
    return null;
  };
  useVehicles.setState({ cars: [], driving: null, target: null, riding: null }); useStocks.setState({ holdings: {} });
  try { await connectWorld(url, '', true); } catch (e) { restoreHome(); leaveShared(); throw e; }
}
/** みんなのワールドの口座（サーバーの正本）に、まだ返事のない自分の出入りを足して表示する */
const actions = new Set<string>(), actionAcks = new Set<string>();
let walletSending: string | null = null, firstAccount = true;
let account: { money: number; ledger: { day: number; label: string; amount: number }[]; cars: unknown[]; stocks?: Record<string, Holding> } | null = null, accountApplying = false;
function showAccount() {
  if (!account) return;
  accountApplying = true;
  try {
    const wallet = savedBundle().wallet;
    const money = wallet ? walletMoney(wallet) : useEconomy.getState().money;
    useEconomy.setState({ money, ledger: account.ledger });
    // 手元で動かした車の位置・向きは保つ（口座の車は駐車のときに同期されるので、運転中は古い位置のまま）
    const local = new Map(useVehicles.getState().cars.map(c => [c.id, c]));
    const cars = account.cars.filter(validCar).map(c => { const l = local.get(c.id); return l ? { ...l, model: c.model, color: c.color, mods: c.mods } : c; });
    if (JSON.stringify(cars) !== JSON.stringify(useVehicles.getState().cars)) useVehicles.setState({ cars });
    const stocks = account.stocks ?? {};
    if (JSON.stringify(stocks) !== JSON.stringify(useStocks.getState().holdings)) useStocks.setState({ holdings: stocks });
  } finally { accountApplying = false; }
}
function flushWallet() {
  if (!sessionGate.shared || !account || firstAccount || walletSending || useSession.getState().status !== 'connected') return;
  const payment = savedBundle().wallet?.pending[0]; if (!payment) return;
  walletSending = payment.id;
  const generation = epoch;
  void persist().then(() => {
    if (generation !== epoch || walletSending !== payment.id || socket?.readyState !== WebSocket.OPEN) return;
    send({ type: 'command', command: { id: payment.id, lot: '', delta: [], reserved: 0, action: { type: 'money', delta: payment.delta, label: payment.label } } });
  }).catch(() => { walletSending = null; useSession.setState({ message: '所持金を保存できません。再接続前にバックアップを保存してください' }); });
}
function receiveAccount(next: NonNullable<typeof account>) {
  const b = savedBundle(), acknowledged = new Set<string>();
  if (firstAccount) {
    for (const p of b.wallet?.pending ?? []) if (remoteWorld?.receipts?.[p.id]?.sender === b.profile.id) acknowledged.add(p.id);
  }
  if (!b.wallet || b.wallet.worldId !== sessionGate.worldId) {
    b.wallet = startWallet(sessionGate.worldId, next.money, useEconomy.getState().money, crypto.randomUUID());
  } else b.wallet = settleWallet(b.wallet, next.money, acknowledged);
  if (firstAccount) walletSending = null;
  firstAccount = false;
  for (const id of actionAcks) actions.delete(id);
  actionAcks.clear(); account = next; showAccount();
  void persist().then(flushWallet).catch(() => useSession.setState({ message: '所持金を保存できませんでした' }));
}
function leaveShared() {
  if (sessionGate.shared) {
    useStocks.setState({ holdings: homeHoldings() });
    if (homePosition) Object.assign(playerMemory, homePosition);
  }
  homePosition = null; sharedSpawn = false;
  sessionGate.shared = false; sessionGate.money = null; sessionGate.act = null;
  walletSending = null; actions.clear(); actionAcks.clear(); account = null;
}
export async function connectWorld(url: string, code = '', shared = false) {
  if (!navigator.onLine) throw Error('みんなと遊ぶには通信が必要です');
  endpoint = endpointURL(url); await persist();
  intendedLeave = false; token = ''; remoteWorld = null;
  sessionGate.role = code || shared ? 'guest' : 'host';
  useSession.setState({ role: sessionGate.role, shared, status: 'connecting', code: code.toUpperCase(), message: '', members: [], poses: {} });
  openConnection(++epoch, false);
}
function openConnection(generation: number, resume: boolean) {
  firstAccount = true; walletSending = null; account = null;
  actions.clear(); actionAcks.clear(); // Account/world snapshots resolve actions whose replies were interrupted.
  const p = savedBundle().profile, state = useSession.getState();
  socket = new WebSocket(endpoint);
  socket.onopen = () => send({ type: state.shared ? 'shared' : resume ? 'resume' : state.role === 'host' ? 'create' : 'join', id: p.id, name: p.name, code: state.code, token, takeover: state.shared && !resume });
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
        if (state.shared && sharedSpawn) {
          sharedSpawn = false;
          const o = civicOffset();
          Object.assign(playerMemory, { x: o.x + VENUE_DOORS.casino.x, y: 0, z: o.z + VENUES.casino.z0 - 2.5,
            yaw: Math.PI, bodyYaw: Math.PI, pitch: -.22, distance: 4.2 });
          // App may already have opened the first-time appearance editor after welcome.
          // Position initialization must not dismiss a dialog the player is using.
          useGame.setState({ mode: 'walk', tool: 'select' });
        }
        syncHistory();
        for (const escrow of savedBundle().pending ?? []) {
          const receipt = m.world.receipts?.[escrow.id];
          if (receipt?.sender === p.id) await finish(receipt.cancelled ? { id: escrow.id, ok: false, message: '未確定だった建築費を返しました' } : { id: escrow.id, ok: true, cost: receipt.cost });
          else if (escrow.worldId === m.world.worldId && escrow.id !== pending?.id) send({ type: 'settle', id: escrow.id });
        }
      } else if (m.type === 'members') {
        for (const id of Object.keys(useSession.getState().poses)) if (!m.members.some((x: Member) => x.id === id)) forgetPose(id);
        useSession.setState({ members: m.members, poses: Object.fromEntries(Object.entries(useSession.getState().poses).filter(([id]) => m.members.some((x: Member) => x.id === id))) });
        if (state.role === 'host') publishWorld();
      } else if (m.type === 'command' && state.role === 'host') approvalQueue = approvalQueue.then(() => accept(m.sender, m.command));
      else if (m.type === 'result' && m.result?.id === walletSending) {
        if (m.result.ok) {
          const b = savedBundle(), w = b.wallet!, payment = w.pending.find(p => p.id === m.result.id)!;
          // A duplicate receipt may return only a result (no account). Settle from the confirmed delta;
          // the next account snapshot remains authoritative and includes any unrelated server income.
          b.wallet = settleWallet(w, w.balance + payment.delta, new Set([payment.id])); walletSending = null;
          showAccount(); void persist().then(flushWallet);
        } else {
          const w = savedBundle().wallet!;
          w.pending = w.pending.filter(p => p.id !== m.result.id); walletSending = null;
          useGame.getState().notify(m.result.message || '所持金を同期できませんでした');
          showAccount(); void persist().then(flushWallet);
        }
      }
      else if (m.type === 'result' && actions.has(m.result?.id)) {
        if (m.result.ok) actionAcks.add(m.result.id); else actions.delete(m.result.id);
        useGame.getState().notify(m.result.message || (m.result.ok ? '完了しました' : 'できませんでした'));
      }
      else if (m.type === 'account' && m.account && Number.isSafeInteger(m.account.money)) receiveAccount(m.account);
      else if (m.type === 'result') await finish(m.result);
      else if (m.type === 'denied') await finish({ id: m.id, ok: false, message: m.message });
      else if (m.type === 'pose' && m.pose && typeof m.pose === 'object') {
        // 服・見た目・車が省かれた pose は、前に届いた分と合わせる。
        const pose = { ...useSession.getState().poses[m.sender], ...m.pose } as RemotePose;
        if (validPose(pose)) { recordPose(m.sender, pose); useSession.setState(s => ({ poses: { ...s.poses, [m.sender]: pose } })); }
      }
      else if (m.type === 'clock' && state.role === 'guest' && [m.clock?.day, m.clock?.clock, m.clock?.market].every(Number.isFinite)) {
        useEconomy.setState({ day: m.clock.day, clock: m.clock.clock, market: m.clock.market, marketHistory: m.clock.marketHistory });
      }
      else if (m.type === 'door' && typeof m.id === 'string' && [0, 1, -1].includes(m.dir)) {
        const open = { ...useDoors.getState().open }; if (m.dir) open[m.id] = m.dir; else delete open[m.id];
        sessionGate.applying = true; useDoors.setState({ open }); sessionGate.applying = false;
      } else if (m.type === 'paused') useSession.setState({ status: 'reconnecting', message: m.message });
      else if (m.type === 'resumed') useSession.setState({ status: 'connected', message: '' });
      else if (m.type === 'closed' || m.type === 'error') {
        const replaced = m.reason === 'replaced';
        if (replaced) sessionGate.superseded = true;
        useSession.setState({ status: 'closed', message: m.message, replaced }); intendedLeave = true;
        socket?.close();
      }
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
  if (sessionGate.superseded) { location.reload(); return; }
  if (sessionGate.shared && useSession.getState().status === 'connected' && (savedBundle().wallet?.pending.length || actions.size)) {
    useSession.setState({ message: '所持金の同期中です。少し待ってから退出してください' }); return;
  }
  if (useSession.getState().busy && useSession.getState().status !== 'closed') { useSession.setState({ message: '建築費の精算待ちです。接続の復帰後に退出してください' }); return; }
  await persist(); intendedLeave = true; ++epoch; clearTimeout(reconnectTimer); send({ type: 'leave' }); socket?.close(); socket = null;
  sessionGate.edit = null; sessionGate.undo = null; ownHistory.length = 0; restoreHome(); leaveShared();
  useDoors.setState({ target: null, climb: null, climbing: false }); useVisit.setState({ plot: null }); useVenue.setState({ inside: null });
  pending = null;
  useSession.setState({ screen: 'menu', role: 'home', shared: false, status: 'offline', code: '', members: [], poses: {}, message: '', busy: false }); await persist();
}
/** Install once outside React effects; subscriptions never outlive the page. */
export function startSessionTimers() {
  const money = useEconomy.subscribe((s, prev) => {
    const w = savedBundle().wallet;
    if (!w || accountApplying || sessionGate.applying || s.money === prev.money) return;
    const delta = s.money - prev.money;
    const txn = s.ledger[0];
    w.pending.push({ id: crypto.randomUUID(), delta, label: (txn?.amount === delta ? txn.label : '個別ワールドの収支').slice(0, 120) });
    void persist().then(flushWallet).catch(() => useSession.setState({ message: '所持金を保存できませんでした' }));
  });
  let wasDriving: string | null = null;
  let lastLots = '';
  sessionGate.visitors = () => { const p = currentPlotOf(useEconomy.getState()); return Object.values(useSession.getState().poses).map(q => ({ x: q.x - plotX(p), y: q.y, z: q.z - plotZ(p), walking: q.walking, driving: q.driving })); };
  sessionGate.remoteCars = () => Object.entries(useSession.getState().poses).flatMap(([owner, q]) => q.cars.map(car => ({ owner, car })));
  // 位置と向きは20回/秒。服・見た目・車は変わったときと1秒ごと（あとから入った人向け）だけ送り、通信量を増やさない。
  let poseTick = 0;
  const sentHeavy: Record<string, string> = {};
  const pose = setInterval(() => {
    const s = useSession.getState(); if (s.status !== 'connected') return;
    const plot = currentPlotOf(useEconomy.getState()), p = playerMemory, v = useVehicles.getState(), full = poseTick++ % 20 === 0;
    const heavy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries({ outfit: useWardrobe.getState().outfit, looks: useLooks.getState().looks, cars: v.cars })) {
      const json = JSON.stringify(value);
      if (full || json !== sentHeavy[key]) { heavy[key] = value; sentHeavy[key] = json; }
    }
    send({ type: 'pose', pose: { x: p.x + plotX(plot), y: p.y, z: p.z + plotZ(plot), yaw: p.yaw, ts: Math.round(performance.now()), ...heavy,
      driving: v.driving, riding: v.riding?.car ?? null, walking: useGame.getState().mode === 'walk' && !v.driving && !v.riding } });
    if (poseTick % 2) return;
    if (s.role === 'host' || s.shared) autoVenueDoors(p, useGame.getState().mode === 'walk' && !v.driving);
    if (v.driving !== wasDriving) { wasDriving = v.driving; void persist(); }
  }, 50);
  const save = setInterval(() => {
    if (useSession.getState().role === 'host' && useSession.getState().status === 'connected') {
      const e = useEconomy.getState(), lots = JSON.stringify(e.lots.map(l => [l.id, l.built, l.construction, l.shop]));
      if (lots !== lastLots) { lastLots = lots; publishWorld(); }
      send({ type: 'clock', clock: { day: e.day, clock: e.clock, market: e.market, marketHistory: e.marketHistory } });
    }
    void persist().catch(() => useSession.setState({ message: '端末への保存に失敗しました。バックアップを保存してください' }));
  }, 2000);
  const cars = useVehicles.subscribe((s, prev) => {
    if (!sessionGate.shared || accountApplying || s.cars === prev.cars || useSession.getState().status !== 'connected') return;
    send({ type: 'command', command: { id: crypto.randomUUID(), lot: '', delta: [], reserved: 0, action: { type: 'cars', cars: s.cars } } });
  });
  const stocks = useStocks.subscribe((s, prev) => {
    if (!sessionGate.shared || accountApplying || s.holdings === prev.holdings || useSession.getState().status !== 'connected') return;
    send({ type: 'command', command: { id: crypto.randomUUID(), lot: '', delta: [], reserved: 0, action: { type: 'stocks', holdings: s.holdings } } });
  });
  const doors = useDoors.subscribe((s, prev) => {
    if (sessionGate.applying || useSession.getState().status !== 'connected' || s.open === prev.open) return;
    for (const id of new Set([...Object.keys(prev.open), ...Object.keys(s.open)])) if (s.open[id] !== prev.open[id]) send({ type: 'door', id, dir: s.open[id] ?? 0 });
  });
  const edits = useGame.subscribe((s, prev) => {
    if (!sessionGate.applying && s.house !== prev.house && !s.dragBase) void persist().catch(() => undefined);
  });
  const hide = () => { if (document.hidden) void persist(); }; document.addEventListener('visibilitychange', hide);
  return () => { money(); cars(); stocks(); clearInterval(pose); clearInterval(save); doors(); edits(); document.removeEventListener('visibilitychange', hide); };
}
