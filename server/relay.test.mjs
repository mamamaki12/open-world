import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createRelay } from './relay.mjs';
async function client(url) {
  const socket = new WebSocket(url), queue = [], waiters = [];
  socket.on('message', raw => { const data = JSON.parse(raw.toString()); queue.push(data); waiters.splice(0).forEach(w => w()); });
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return { socket, send: data => socket.send(JSON.stringify(data)), next: async type => {
    const stop = Date.now() + 3000;
    while (Date.now() < stop) { const i = queue.findIndex(x => x.type === type); if (i >= 0) return queue.splice(i, 1)[0];
      await new Promise(resolve => { const t = setTimeout(resolve, 25); waiters.push(() => { clearTimeout(t); resolve(); }); }); }
    throw Error('timeout waiting for ' + type + JSON.stringify(queue));
  }};
}
test('room permissions, sender identity, isolated routing and world resume', async () => {
  const relay = createRelay({ graceMs: 2000 });
  await new Promise(resolve => relay.http.listen(0, '127.0.0.1', resolve));
  const url = 'ws://127.0.0.1:' + relay.http.address().port;
  try {
    const host = await client(url); host.send({ type: 'create', id: 'host', name: 'ホスト' });
    const room = await host.next('welcome');
    const guest = await client(url); guest.send({ type: 'join', id: 'guest', name: '友達', code: room.code });
    const joined = await guest.next('welcome'); assert.equal(joined.canBuild, false);
    guest.send({ type: 'command', command: { id: 'x' }, sender: 'host' }); assert.equal((await guest.next('denied')).id, 'x');
    host.send({ type: 'permission', target: 'guest', canBuild: true });
    while (!(await guest.next('members')).members.find(x => x.id === 'guest').canBuild) {}
    guest.send({ type: 'command', command: { id: 'y' }, sender: 'host' }); assert.equal((await host.next('command')).sender, 'guest');
    host.send({ type: 'world', world: { sample: 1 } }); assert.deepEqual((await guest.next('world')).world, { sample: 1 });
    host.socket.close(); await guest.next('paused');
    const resumed = await client(url); resumed.send({ type: 'resume', id: 'host', name: 'ホスト', code: room.code, token: room.token });
    await resumed.next('welcome'); assert.deepEqual((await resumed.next('world')).world, { sample: 1 }); await guest.next('resumed');
    resumed.send({ type: 'leave' }); await guest.next('closed');
  } finally { relay.close(); }
});
test('host loss closes a room after grace period', async () => {
  const relay = createRelay({ graceMs: 50 }); await new Promise(resolve => relay.http.listen(0, '127.0.0.1', resolve));
  try { const url = 'ws://127.0.0.1:' + relay.http.address().port, h = await client(url); h.send({ type: 'create', id: 'h', name: 'h' });
    const { code } = await h.next('welcome'), g = await client(url); g.send({ type: 'join', id: 'g', name: 'g', code }); await g.next('welcome');
    h.socket.close(); await g.next('closed');
  } finally { relay.close(); }
});
