// みんなのワールド：ログアウトした人の車は消え、入り直すと車屋の横の駐車場（土地があればその前の道路）に置かれる
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';
const relay = createRelay(); await relay.ready;
await new Promise(r => relay.http.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const base = process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/';
const url = base + '?touch=0&relay=' + encodeURIComponent('ws://127.0.0.1:' + relay.http.address().port);
const errors = [];
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 680, height: 520 } }), page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message)); page.setDefaultTimeout(120000);
  await page.goto(url); return page;
}
async function until(page, fn, arg) {
  for (const end = Date.now() + 120000; Date.now() < end; await page.waitForTimeout(100)) if (await page.evaluate(fn, arg)) return;
  throw Error('timed out: ' + fn);
}
const connected = async () => (await import('/src/session/session.ts')).useSession.getState().status === 'connected';
const join = async page => { await page.getByRole('button', { name: 'みんなのワールドで遊ぶ', exact: false }).click(); await until(page, connected); };
const a = await open(), b = await open();
await join(a);
// A の車を町の外れに置き、サーバーの口座に保存されるのを待つ
await a.evaluate(async () => {
  const { useVehicles } = await import('/src/state/vehicles.ts');
  useVehicles.setState({ cars: [{ id: 'car-a', model: 'aria', color: '#204f7b', x: 12, z: 40, yaw: 1, speed: 0, steer: 0, wheelSpin: 0, braking: false, lights: true, mods: { } }] });
});
const aId = await a.evaluate(async () => (await import('/src/session/gate.ts')).sessionGate.selfId());
for (const end = Date.now() + 60000; Date.now() < end && !relay.world().accounts[aId]?.cars?.length; await a.waitForTimeout(200));
assert.equal(relay.world().accounts[aId].cars[0].x, 12, '口座に車の位置が保存される');
await join(b);
const remote = () => b.evaluate(async () => (await import('/src/session/gate.ts')).sessionGate.remoteCars().map(r => r.car.id));
await until(b, async () => (await import('/src/session/gate.ts')).sessionGate.remoteCars().length > 0);
console.log('A がいる間の B から見える車:', await remote());
await a.evaluate(async () => (await import('/src/session/session.ts')).leaveWorld());
await until(b, async () => (await import('/src/session/gate.ts')).sessionGate.remoteCars().length === 0);
console.log('A が出たあと:', await remote());
await join(a);
const placed = await a.evaluate(async () => {
  const { useVehicles } = await import('/src/state/vehicles.ts'); const { dealerSpots } = await import('/src/world/carSpawn.ts');
  const c = useVehicles.getState().cars[0]; return { car: { x: c.x, z: c.z, yaw: c.yaw }, bay: dealerSpots()[0] };
});
console.log('入り直した A の車:', JSON.stringify(placed));
assert.ok(Math.hypot(placed.car.x - placed.bay.x, placed.car.z - placed.bay.z) < .01, '土地がなければ車屋の駐車場に置く');
await until(b, async () => (await import('/src/session/gate.ts')).sessionGate.remoteCars().length > 0);
console.log('A が戻ったあと B から:', await remote());
// 土地を持っていれば、その土地の前の道路に置く（サーバーの正本で A を区画の持ち主にする）
await a.evaluate(async () => (await import('/src/session/session.ts')).leaveWorld());
const w = relay.world(), lot = { id: 'lot-a', name: 'Aの土地', location: 'rural', variance: 1, built: null, design: null, construction: null,
  rented: false, invested: 0, plot: -2, owner: aId, ownerName: 'A' };
w.economy.lots.push(lot);
{
  await join(a);
  const front = await a.evaluate(async plot => {
    const { useVehicles } = await import('/src/state/vehicles.ts'); const { lotFrontSpots } = await import('/src/world/carSpawn.ts');
    const c = useVehicles.getState().cars[0]; return { car: { x: c.x, z: c.z }, spot: lotFrontSpots({ plot })[0] };
  }, lot.plot);
  console.log('土地の前:', JSON.stringify(front));
  assert.ok(Math.hypot(front.car.x - front.spot.x, front.car.z - front.spot.z) < .01, '自分の土地の前の道路に置く');
  // 車の横に立って見る
  await a.evaluate(async () => {
    const { useVehicles } = await import('/src/state/vehicles.ts'); const { currentPlotOf, useEconomy } = await import('/src/state/economy.ts'); const { plotX, plotZ } = await import('/src/economy/town.ts');
    const c = useVehicles.getState().cars[0], p = currentPlotOf(useEconomy.getState()); window.__ow.game.getState().setMode('walk');
    Object.assign(window.__ow.player, { x: c.x - plotX(p) - 10, z: c.z - plotZ(p) + 4, y: 0, yaw: -Math.PI / 2 + .3, bodyYaw: -Math.PI / 2 + .3, pitch: -.15 });
  });
  await a.waitForTimeout(2500); await a.screenshot({ path: 'browser-checks/offline-cars-lot.png' });
}
assert.deepEqual(errors, []);
console.log('ok'); await browser.close(); relay.close(); process.exit(0);
