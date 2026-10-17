import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createRelay } from './dist/relay.mjs';
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
test('slow transaction saves serialize midnight rent and new accounts without losing either', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let unblock, entered, disk;
  const saving = new Promise(r => { entered = r; }), resume = new Promise(r => { unblock = r; });
  let blocked = false;
  const relay = createRelay({ persistWorld: async (_file, world) => {
    if (world.receipts['race-money'] && !blocked) { blocked = true; entered(); await resume; }
    disk = structuredClone(world);
  } });
  await relay.ready; await new Promise(r => relay.http.listen(0, '127.0.0.1', r));
  const url = 'ws://127.0.0.1:' + relay.http.address().port;
  try {
    const a = await client(url); a.send({ type: 'shared', id: 'tenant', name: 'Tenant' }); await a.next('welcome');
    const w = relay.world();
    w.accounts.tenant.money = 1000;
    w.accounts.owner = { name: 'Owner', money: 100, cars: [], ledger: [] };
    w.economy.clock = 59.99;
    w.economy.lots = [{ id: 'rental', name: 'Rental', owner: 'owner', tenant: 'tenant', rentOffer: { rent: 100 } }];
    a.send({ type: 'command', command: { id: 'race-money', lot: '', delta: [], reserved: 0, action: { type: 'money', delta: 1, label: 'test' } } });
    await saving;
    t.mock.timers.tick(1000);
    const b = await client(url); b.send({ type: 'shared', id: 'newcomer', name: 'New' });
    // The new account and midnight must both wait until the transaction is durable.
    assert.equal(relay.world().economy.day, 1);
    assert.equal(relay.world().accounts.tenant.money, 1000);
    unblock(); await b.next('welcome'); await relay.flush();
    assert.equal(relay.world().economy.day, 2);
    assert.equal(relay.world().accounts.tenant.money, 901);
    assert.equal(relay.world().accounts.owner.money, 200);
    assert.ok(relay.world().accounts.newcomer);
    assert.deepEqual(disk, relay.world());
  } finally { unblock(); relay.close(); }
});
test('failed account saves do not publish or retain an uncommitted account', async () => {
  const relay = createRelay({ persistWorld: async () => { throw Error('disk full'); } });
  await relay.ready; await new Promise(r => relay.http.listen(0, '127.0.0.1', r));
  try {
    const a = await client('ws://127.0.0.1:' + relay.http.address().port);
    a.send({ type: 'shared', id: 'unsaved', name: 'Unsaved' });
    assert.match((await a.next('error')).message, /保存/);
    await relay.flush().catch(() => {});
    assert.equal(relay.world().accounts.unsaved, undefined);
  } finally { relay.close(); }
});
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
    guest.send({ type: 'trade', target: 'host', trade: { kind: 'offer', id: 't' }, sender: 'x' });
    const traded = await host.next('trade'); assert.equal(traded.sender, 'guest'); assert.equal(traded.trade.id, 't');
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
test('leaving and rejoining is not removed by the previous connection cleanup', async () => {
  const relay = createRelay({ graceMs: 80 });
  await new Promise(resolve => relay.http.listen(0, '127.0.0.1', resolve));
  try {
    const url = 'ws://127.0.0.1:' + relay.http.address().port;
    const host = await client(url); host.send({ type: 'create', id: 'host', name: 'host' });
    const { code } = await host.next('welcome');
    const first = await client(url); first.send({ type: 'join', id: 'guest', name: 'guest', code }); await first.next('welcome');
    const closed = new Promise(resolve => first.socket.once('close', resolve)); first.send({ type: 'leave' }); await closed;
    const second = await client(url); second.send({ type: 'join', id: 'guest', name: 'guest', code }); await second.next('welcome');
    await new Promise(resolve => setTimeout(resolve, 160));
    host.send({ type: 'permission', target: 'guest', canBuild: true });
    while (!(await second.next('members')).members.find(m => m.id === 'guest')?.canBuild) {}
    second.send({ type: 'command', command: { id: 'after-rejoin' } });
    assert.equal((await host.next('command')).command.id, 'after-rejoin');
    const duplicate = await client(url); duplicate.send({ type: 'create', id: 'guest', name: 'guest' });
    await duplicate.next('error');
  } finally { relay.close(); }
});
test('shared world: everyone builds in one town, limit, settle and restart persistence', async () => {
  const { mkdtemp, readFile } = await import('node:fs/promises'), { tmpdir } = await import('node:os'), { join } = await import('node:path');
  const worldFile = join(await mkdtemp(join(tmpdir(), 'shared-')), 'world.json');
  const start = async () => { const r = createRelay({ graceMs: 100, worldFile }); await r.ready; await new Promise(res => r.http.listen(0, '127.0.0.1', res)); return [r, 'ws://127.0.0.1:' + r.http.address().port]; };
  let [relay, url] = await start();
  const floor = { id: 'f-test', level: 0, x0: 20, z0: 16, x1: 22, z1: 18, finish: { material: 'flooring', color: '#c8a27a' } };
  try {
    const a = await client(url); a.send({ type: 'shared', id: 'a', name: 'A' });
    assert.equal((await a.next('welcome')).canBuild, true); const first = await a.next('world');
    const b = await client(url); b.send({ type: 'shared', id: 'b', name: 'B' }); await b.next('welcome'); await b.next('world');
    const dup = await client(url); dup.send({ type: 'shared', id: 'b', name: 'B' }); assert.match((await dup.next('error')).message, /別のタブ/);
    assert.equal(first.world.economy.lots.length, 0); assert.equal(first.world.accounts, undefined);
    assert.equal((await a.next('account')).account.money, 1000000);
    a.send({ type: 'command', command: { id: 'm1', lot: '', delta: [], reserved: 0, action: { type: 'money', delta: 1e8, label: 'test' } } });
    assert.equal((await a.next('result')).result.ok, true); await a.next('account');
    a.send({ type: 'command', command: { id: 'l1', lot: '', delta: [], reserved: 1e9, action: { type: 'buyLand', offer: first.world.economy.offers[0].id } } });
    assert.equal((await a.next('result')).result.ok, true);
    const lot = (await b.next('world')).world.economy.lots[0];
    assert.equal(lot.owner, 'a'); assert.ok((await a.next('account')).account.money < 1e8);
    a.send({ type: 'command', command: { id: 'c1', lot: lot.id, reserved: 1e9, delta: [{ kind: 'floors', id: 'f-test', before: null, after: floor }] } });
    assert.equal((await a.next('result')).result.ok, true);
    assert.ok((await b.next('world')).world.house.floors.some(f => f.id === 'f-test'));
    b.send({ type: 'settle', id: 'never-sent' }); assert.equal((await b.next('result')).result.ok, false);
    const extra = [];
    for (let i = 0; i < 8; i++) { const c = await client(url); c.send({ type: 'shared', id: 'x' + i, name: 'x' }); await c.next('welcome'); extra.push(c); }
    const eleventh = await client(url); eleventh.send({ type: 'shared', id: 'over', name: 'over' }); assert.match((await eleventh.next('error')).message, /10人/);
    [a, b, ...extra].forEach(c => c.socket.close());
    await relay.flush(); relay.close();
    assert.ok(JSON.parse(await readFile(worldFile, 'utf8')).house.floors.some(f => f.id === 'f-test'));
    [relay, url] = await start();
    const c = await client(url); c.send({ type: 'shared', id: 'a', name: 'A' }); await c.next('welcome');
    const again = (await c.next('world')).world;
    assert.ok(again.house.floors.some(f => f.id === 'f-test')); assert.equal(again.receipts.c1.sender, 'a');
  } finally { relay.close(); }
});
