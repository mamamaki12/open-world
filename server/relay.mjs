import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { open, readFile, rename } from 'node:fs/promises';
import { WebSocketServer, WebSocket } from 'ws';
import { SHARED_LIMIT, applyCommand, initialSharedWorld, publicWorld, tickWorld, validSharedWorld, withAccount } from '../src/server/sharedWorld.ts';

export const RELAY_VERSION = '2026-10-24 だれでも建築・町の家';

// みんなのワールドの保存。書き終えてから差し替えるので、途中で落ちても前の保存が残る
async function saveWorld(file, world) {
  if (!file) return;
  const tmp = file + '.tmp', handle = await open(tmp, 'w');
  try { await handle.writeFile(JSON.stringify(world)); await handle.sync(); } finally { await handle.close(); }
  await rename(tmp, file);
}
async function loadWorld(file) {
  if (!file) return initialSharedWorld(randomUUID());
  let text;
  try { text = await readFile(file, 'utf8'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; const world = initialSharedWorld(randomUUID()); await saveWorld(file, world); return world; }
  const world = JSON.parse(text);
  if (!validSharedWorld(world)) throw Error('共有ワールドの保存データを読めません（上書きせず停止します）: ' + file);
  return world;
}

export function createRelay({ origins = [], graceMs = 30000, worldFile = null, tickMs = 1000, persistWorld = saveWorld } = {}) {
  const rooms = new Map();
  const identities = new Map();
  const shared = { members: new Map(), world: null, queue: Promise.resolve(), beat: 0 };
  const ready = loadWorld(worldFile).then(w => { shared.world = w; });
  const sharedSend = data => shared.members.forEach(m => send(m.socket, data));
  const sharedRoster = () => sharedSend({ type: 'members', members: [...shared.members.values()].filter(m => m.socket).map(m => ({ id: m.id, name: m.name, host: false, canBuild: true })) });
  const accounts = () => shared.members.forEach(m => send(m.socket, { type: 'account', account: shared.world.accounts?.[m.id] ?? null }));
  const clockOf = w => ({ day: w.economy.day, clock: w.economy.clock, market: w.economy.market, marketHistory: w.economy.marketHistory });
  const enqueue = job => (shared.queue = shared.queue.then(job, job));
  const ticker = setInterval(() => {
    if (!shared.world) return;
    // 日替わり・参加・取引は同じ列で確定する。保存待ち中の更新を上書きしない。
    enqueue(async () => {
      const t = tickWorld(shared.world, tickMs / 1000, Math.random);
      if (t.newDay) await persistWorld(worldFile, t.world);
      shared.world = t.world;
      if (t.newDay) { sharedSend({ type: 'world', world: publicWorld(shared.world) }); accounts(); }
      if (++shared.beat % 2 === 0) sharedSend({ type: 'clock', clock: clockOf(shared.world) });
    }).catch(e => console.error('save failed', e));
  }, tickMs); ticker.unref();
  // /version で、EC2 で動いている中継がどの版か確かめられる（中継を変えたら日付と内容を書き換える）
  const http = createServer((req, res) => {
    const body = req.url === '/health' ? 'ok' : req.url === '/version' ? RELAY_VERSION : null;
    res.writeHead(body === null ? 404 : 200); res.end(body ?? 'not found');
  });
  const wss = new WebSocketServer({ server: http, maxPayload: 2 * 1024 * 1024,
    verifyClient: ({ origin }) => !origins.length || origins.includes(origin) });
  const send = (s, data) => { if (s?.readyState === WebSocket.OPEN) s.send(JSON.stringify(data)); };
  const broadcast = (r, data) => r.members.forEach(m => send(m.socket, data));
  const roster = r => broadcast(r, { type: 'members', members: [...r.members.values()].map(m => ({ id: m.id, name: m.name, host: m.id === r.host, canBuild: m.canBuild })) });
  const closeRoom = (code, room) => { clearTimeout(room.timer); broadcast(room, { type: 'closed', message: 'ホストが退出しました' }); room.members.forEach(m => { identities.delete(m.id); m.socket?.close(); }); rooms.delete(code); };
  wss.on('connection', socket => {
    let member, room, code, count = 0, bytes = 0, windowAt = Date.now();
    const handshake = setTimeout(() => socket.close(1008, 'handshake timeout'), 10000);
    socket.on('message', raw => {
      try {
        if (Date.now() - windowAt > 1000) { count = 0; bytes = 0; windowAt = Date.now(); }
        bytes += raw.length;
        if (++count > 60 || bytes > 6 * 1024 * 1024) return socket.close(1008, 'rate limit');
        const data = JSON.parse(raw.toString());
        if (!member) {
          const id = data.id, name = data.name;
          if (typeof id !== 'string' || id.length > 100 || typeof name !== 'string' || !name.length || name.length > 24) throw Error('参加者情報が不正です');
          if (data.type !== 'resume' && identities.has(id)) throw Error('このゲストはすでに別のタブで参加しています');
          if (data.type === 'shared') {
            if (!shared.world) throw Error('ワールドを準備しています。少し待ってからやり直してください');
            const prev = shared.members.get(id);
            const previousSocket = prev?.socket;
            if (previousSocket && data.takeover !== true) {
              send(socket, { type: 'error', reason: 'replaced', message: '別の画面で参加中です。開始画面から入り直してください' });
              socket.close(1008, 'replaced'); return;
            }
            if (!prev && [...shared.members.values()].filter(m => m.socket).length >= SHARED_LIMIT) throw Error(`みんなのワールドは${SHARED_LIMIT}人までです`);
            member = prev ?? { id, shared: true }; member.name = name; member.socket = socket; shared.members.set(id, member);
            if (previousSocket) {
              send(previousSocket, { type: 'closed', reason: 'replaced', message: '別の画面でワールドに入りました。この画面の接続を終了しました' });
              previousSocket.close(1000, 'replaced');
            }
            clearTimeout(handshake);
            enqueue(async () => {
              const joined = withAccount(shared.world, id, name);
              if (joined !== shared.world) { await persistWorld(worldFile, joined); shared.world = joined; }
              send(socket, { type: 'welcome', code: 'SHARED', token: randomUUID(), host: '', canBuild: true, shared: true });
              send(socket, { type: 'world', world: publicWorld(shared.world) }); send(socket, { type: 'account', account: shared.world.accounts[id] }); sharedRoster();
            }).catch(() => { send(socket, { type: 'error', message: 'サーバーに保存できませんでした' }); socket.close(1011); });
            return;
          }
          if (data.type === 'create') {
            if (rooms.size >= 100) throw Error('部屋が満員です');
            do { code = randomBytes(4).toString('hex').toUpperCase(); } while (rooms.has(code));
            room = { host: id, members: new Map(), world: null, timer: null }; rooms.set(code, room);
          } else {
            code = String(data.code).toUpperCase(); room = rooms.get(code);
            if (!room) throw Error('部屋が見つかりません');
          }
          const previous = room.members.get(id);
          if (data.type === 'resume') {
            if (!previous || previous.token !== data.token || previous.socket) throw Error('再接続できません');
            member = previous;
          } else {
            if (!['create', 'join'].includes(data.type)) throw Error('参加方法が不正です');
            if (previous) throw Error('このゲストはすでに参加しています');
            if (room.members.size >= 4) throw Error('参加できるのは4人までです');
            if (data.type === 'join' && !room.members.get(room.host)?.socket) throw Error('ホストの再接続を待っています');
            member = { id, name, token: randomUUID(), socket: null, canBuild: id === room.host };
            room.members.set(id, member);
            identities.set(id, code);
          }
          clearTimeout(handshake); member.socket = socket;
          if (id === room.host) { clearTimeout(room.timer); room.timer = null; }
          send(socket, { type: 'welcome', code, token: member.token, host: room.host, canBuild: member.canBuild });
          if (room.world) send(socket, { type: 'world', world: room.world });
          roster(room); if (id === room.host) broadcast(room, { type: 'resumed' });
          return;
        }
        if (member.shared) {
          // A superseded socket must not edit, leave, or broadcast for its replacement.
          if (member.socket !== socket) { socket.close(1000, 'replaced'); return; }
          if (data.type === 'leave') { shared.members.delete(member.id); socket.close(); sharedRoster(); return; }
          if (data.type === 'command' || (data.type === 'settle' && typeof data.id === 'string')) {
            const command = data.type === 'settle' ? { id: data.id, settle: true } : data.command, who = member;
            enqueue(async () => {
              const r = applyCommand(shared.world, who.id, command, who.name);
              if (r.changed) {
                await persistWorld(worldFile, r.world); // 保存が終わってから確定を知らせる
                shared.world = r.world;
              }
              send(who.socket, { type: 'result', result: r.result });
              if (r.changed) {
                // お金だけの変化は本人の口座だけ送る
                if (!['money', 'cars', 'stocks'].includes(command?.action?.type)) sharedSend({ type: 'world', world: publicWorld(shared.world) });
                accounts();
              }
            }).catch(() => send(who.socket, { type: 'result', result: { id: command?.id, ok: false, message: 'サーバーに保存できませんでした' } }));
            return;
          }
          if (data.type === 'pose') { shared.members.forEach(m => { if (m !== member) send(m.socket, { type: 'pose', sender: member.id, pose: data.pose }); }); return; }
          if (data.type === 'door') sharedSend({ type: 'door', sender: member.id, id: data.id, dir: data.dir });
          return;
        }
        if (data.type === 'leave') { if (member.id === room.host) closeRoom(code, room); else { room.members.delete(member.id); identities.delete(member.id); socket.close(); roster(room); } return; }
        if (data.type === 'world' && member.id === room.host) {
          room.world = data.world;
          room.members.forEach(m => { if (m !== member) send(m.socket, { type: 'world', world: data.world }); }); return;
        }
        if (data.type === 'permission' && member.id === room.host) {
          const target = room.members.get(data.target);
          if (target && target.id !== room.host) { target.canBuild = data.canBuild === true; roster(room); } return;
        }
        if (data.type === 'command') {
          if (!member.canBuild || !room.members.get(room.host)?.socket) { send(socket, { type: 'denied', id: data.command?.id, message: '共同建築が許可されていません' }); return; }
          send(room.members.get(room.host).socket, { type: 'command', sender: member.id, command: data.command }); return;
        }
        if (data.type === 'settle' && typeof data.id === 'string') {
          send(room.members.get(room.host)?.socket, { type: 'command', sender: member.id, command: { id: data.id, settle: true } }); return;
        }
        if (data.type === 'result' && member.id === room.host) { send(room.members.get(data.target)?.socket, { type: 'result', result: data.result }); return; }
        if (data.type === 'clock' && member.id === room.host) { room.members.forEach(m => { if (m !== member) send(m.socket, { type: 'clock', clock: data.clock }); }); return; }
        if (data.type === 'pose') { room.members.forEach(m => { if (m !== member) send(m.socket, { type: 'pose', sender: member.id, pose: data.pose }); }); return; }
        if (data.type === 'trade') { const to = room.members.get(data.target); if (to && to !== member) send(to.socket, { type: 'trade', sender: member.id, trade: data.trade }); return; }
        if (data.type === 'door') broadcast(room, { type: 'door', sender: member.id, id: data.id, dir: data.dir });
      } catch (e) { send(socket, { type: 'error', message: e.message }); if (!member) socket.close(1008); }
    });
    socket.on('error', () => {});
    socket.on('close', () => {
      clearTimeout(handshake);
      if (member?.shared) {
        if (member.socket !== socket) return;
        member.socket = null; sharedRoster(); const lost = member;
        setTimeout(() => { if (!lost.socket && shared.members.get(lost.id) === lost) shared.members.delete(lost.id); }, graceMs).unref();
        return;
      }
      if (!member || !room || rooms.get(code) !== room || room.members.get(member.id) !== member) return;
      member.socket = null;
      if (member.id === room.host) {
        broadcast(room, { type: 'paused', message: 'ホストとの接続が切れました。再接続を待っています' });
        room.timer = setTimeout(() => closeRoom(code, room), graceMs);
      } else {
        const lost = member;
        setTimeout(() => { if (!lost.socket && rooms.get(code) === room && room.members.get(lost.id) === lost) { room.members.delete(lost.id); identities.delete(lost.id); roster(room); } }, graceMs).unref();
      }
    });
  });
  return { http, wss, ready, flush: () => shared.queue, world: () => shared.world, close: () => { clearInterval(ticker); rooms.forEach(r => clearTimeout(r.timer)); rooms.clear(); identities.clear(); wss.clients.forEach(s => s.terminate()); wss.close(); http.close(); } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const origins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  if (process.env.NODE_ENV === 'production' && !origins.length) throw Error('ALLOWED_ORIGINS is required in production');
  const relay = createRelay({ origins, worldFile: process.env.WORLD_FILE || new URL('./shared-world.json', import.meta.url).pathname });
  await relay.ready;
  relay.http.listen(Number(process.env.PORT || 8787), '0.0.0.0', () => console.log('World relay listening on', relay.http.address().port));
}
