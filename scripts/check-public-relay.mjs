import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';

const endpoint = process.env.WORLD_RELAY || 'wss://shingo-open-world.duckdns.org';
const origin = 'https://mamamaki12.github.io';
const clients = [];
async function connect() {
  const socket = new WebSocket(endpoint, { origin, handshakeTimeout: 15000 });
  clients.push(socket);
  const messages = [];
  socket.on('message', raw => messages.push(JSON.parse(raw.toString())));
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return { send: data => socket.send(JSON.stringify(data)), async next(type) {
    const end = Date.now() + 15000;
    while (Date.now() < end) {
      const i = messages.findIndex(m => m.type === type);
      if (i >= 0) return messages.splice(i, 1)[0];
      const error = messages.find(m => m.type === 'error');
      if (error) throw Error(error.message);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw Error('Timed out waiting for ' + type);
  } };
}
try {
  const health = await fetch(endpoint.replace(/^wss:/, 'https:') + '/health', { signal: AbortSignal.timeout(15000) });
  assert.equal(await health.text(), 'ok');
  const host = await connect(), guest = await connect();
  const hostId = randomUUID(), guestId = randomUUID();
  host.send({ type: 'create', id: hostId, name: '接続確認ホスト' });
  const { code } = await host.next('welcome');
  guest.send({ type: 'join', id: guestId, name: '接続確認ゲスト', code });
  assert.equal((await guest.next('welcome')).canBuild, false);
  guest.send({ type: 'command', command: { id: 'permission-check' } });
  assert.equal((await guest.next('denied')).id, 'permission-check');
  host.send({ type: 'permission', target: guestId, canBuild: true });
  while (!(await guest.next('members')).members.some(m => m.id === guestId && m.canBuild)) {}
  guest.send({ type: 'command', sender: hostId, command: { id: 'routing-check' } });
  const routed = await host.next('command');
  assert.equal(routed.sender, guestId);
  assert.equal(routed.command.id, 'routing-check');
  host.send({ type: 'world', world: { smokeTest: true } });
  assert.equal((await guest.next('world')).world.smokeTest, true);
  host.send({ type: 'leave' });
  await guest.next('closed');
  console.log('Public HTTPS / WSS / room join / permission / sender identity / world relay / cleanup passed');
} finally { clients.forEach(socket => socket.terminate()); }
