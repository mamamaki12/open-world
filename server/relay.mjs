import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

export function createRelay({ origins = [], graceMs = 30000 } = {}) {
  const rooms = new Map();
  const identities = new Map();
  const http = createServer((req, res) => { res.writeHead(req.url === '/health' ? 200 : 404); res.end(req.url === '/health' ? 'ok' : 'not found'); });
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
        if (data.type === 'door') broadcast(room, { type: 'door', sender: member.id, id: data.id, dir: data.dir });
      } catch (e) { send(socket, { type: 'error', message: e.message }); if (!member) socket.close(1008); }
    });
    socket.on('error', () => {});
    socket.on('close', () => {
      clearTimeout(handshake); if (!member || !room || rooms.get(code) !== room || room.members.get(member.id) !== member) return;
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
  return { http, wss, close: () => { rooms.forEach(r => clearTimeout(r.timer)); rooms.clear(); identities.clear(); wss.clients.forEach(s => s.terminate()); wss.close(); http.close(); } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const origins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  if (process.env.NODE_ENV === 'production' && !origins.length) throw Error('ALLOWED_ORIGINS is required in production');
  const relay = createRelay({ origins });
  relay.http.listen(Number(process.env.PORT || 8787), '0.0.0.0', () => console.log('World relay listening on', relay.http.address().port));
}
