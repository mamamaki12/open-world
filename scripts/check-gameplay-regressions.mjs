import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { WebSocket } from 'ws';
import { createRelay } from '../server/dist/relay.mjs';

await mkdir('world-session-checks', { recursive: true });
const relay = createRelay(); await relay.ready;
const world = relay.world(), foreignPlot = world.economy.offers.shift();
world.accounts.other = { name: 'ほかの人', money: 1000, cars: [], ledger: [] };
world.economy.lots.push({ id: 'foreign', name: 'ほかの人の家', location: foreignPlot.location, variance: 1,
  built: null, design: null, construction: null, rented: false, invested: 0, plot: foreignPlot.plot, owner: 'other', ownerName: 'ほかの人' });
await new Promise(r => relay.http.listen(0, '127.0.0.1', r));
const endpoint = 'ws://127.0.0.1:' + relay.http.address().port;
const sockets = []; relay.wss.on('connection', s => sockets.push(s));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const base = process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/';
const errors = [];
const trace = [];
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }), page = await ctx.newPage();
page.setDefaultTimeout(90000); page.on('pageerror', e => errors.push(e.message));
page.on('websocket', ws => { ws.on('framereceived', ({ payload }) => { const m = JSON.parse(String(payload)); if (['welcome','world','account','error','closed'].includes(m.type)) trace.push({ type:m.type, cars:m.account?.cars?.length, message:m.message }); }); });
async function wait(fn) {
  for (const end = Date.now() + 90000; Date.now() < end; await page.waitForTimeout(100)) if (await page.evaluate(fn)) return;
  throw Error('Gameplay condition timed out: ' + fn);
}
const ready = async () => {
  const { useSession } = await import('/src/session/session.ts'), { savedBundle } = await import('/src/session/saves.ts');
  return useSession.getState().status === 'connected' && savedBundle().wallet && !savedBundle().wallet.pending.length;
};
async function leave() {
  // Leaving intentionally waits for the final car snapshot acknowledgement.
  for (let i = 0; i < 80; i++) {
    if (await page.evaluate(async () => (await import('/src/session/session.ts')).useSession.getState().screen === 'menu')) return;
    await page.evaluate(async () => (await import('/src/session/session.ts')).leaveWorld());
    await page.waitForTimeout(100);
  }
  throw Error('Leave did not finish');
}
async function join() {
  await page.getByRole('button', { name: 'みんなのワールドで遊ぶ', exact: false }).click(); await wait(ready);
  // Car/account assertions mutate stores directly; keep the city renderer paused while they run.
  await page.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().setOverlay('controls'));
}
try {
  await page.goto(base + '?touch=0&relay=' + encodeURIComponent(endpoint)); await page.getByLabel('あなたの名前').waitFor();
  await page.evaluate(async () => {
    window.__overlayTrace = [];
    (await import('/src/state/store.ts')).useGame.subscribe((s, p) => { if(s.overlay !== p.overlay) window.__overlayTrace.push({ from:p.overlay,to:s.overlay,stack:new Error().stack }); });
  });
  await page.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.setState({ money: 20000000, tick: () => {} }));
  await join();
  console.log('shared joined');
  await page.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().setOverlay('map'));
  await page.getByText('あなたの家・土地（0）', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'ほかの人の家', exact: true }).click();
  await page.getByText('所有者：ほかの人', { exact: true }).waitFor();
  await page.screenshot({ path: 'world-session-checks/ownership-desktop.png' });
  await page.keyboard.press('Escape');
  await page.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().setOverlay('controls'));
  console.log('zero-owned map passed');
  await page.evaluate(async () => {
    const error = (await import('/src/state/vehicles.ts')).buyCar('moco', '#abcdef', true); if (error) throw Error(error);
  });
  await wait(ready);
  await wait(async () => (await import('/src/state/vehicles.ts')).useVehicles.getState().cars.length === 1);
  const id = await page.evaluate(async () => (await import('/src/session/saves.ts')).savedBundle().profile.id);
  const carId = await page.evaluate(async () => (await import('/src/state/vehicles.ts')).useVehicles.getState().cars[0].id);
  const moved = await page.evaluate(async () => {
    const car = (await import('/src/state/vehicles.ts')).useVehicles.getState().cars[0];
    car.x += 20; car.z += 15;
    (await import('/src/state/economy.ts')).useEconomy.getState().receive(123, 'regression income');
    return { x: car.x, z: car.z };
  });
  await wait(ready);
  const position = () => page.evaluate(async () => { const c = (await import('/src/state/vehicles.ts')).useVehicles.getState().cars[0]; return { x: c.x, z: c.z }; });
  assert.deepEqual(await position(), moved, 'money updates must not rewind the car');
  console.log('purchase and income passed');
  for (let i = 0; i < 100 && relay.world().accounts[id].cars[0]?.x !== moved.x; i++) await page.waitForTimeout(100);
  assert.equal(relay.world().accounts[id].cars[0].x, moved.x, 'in-place driving changes reach server');
  const other = new WebSocket(endpoint); await new Promise(r => other.once('open', r));
  const otherReady = new Promise(r => other.on('message', raw => { if (JSON.parse(raw).type === 'welcome') r(); }));
  other.send(JSON.stringify({ type: 'shared', id: 'other', name: 'ほかの人' })); await otherReady;
  other.send(JSON.stringify({ type: 'command', command: { id: 'other-income', lot: '', delta: [], reserved: 0, action: { type: 'money', delta: 1, label: 'test' } } }));
  await page.waitForTimeout(300); assert.deepEqual(await position(), moved, 'another player must not rewind the car');
  other.close();
  console.log('other-player account update passed');
  const secondMove = await page.evaluate(async () => { const c = (await import('/src/state/vehicles.ts')).useVehicles.getState().cars[0]; c.x += 3; return { x: c.x, z: c.z }; });
  sockets[0].terminate(); await page.waitForTimeout(2000); await wait(ready);
  assert.deepEqual(await position(), secondMove, 'reconnect preserves unacknowledged driving position');
  console.log('reconnect passed');
  await page.evaluate(async () => {
    const { customizeCar, useVehicles } = await import('/src/state/vehicles.ts'); const c = useVehicles.getState().cars[0];
    const err = customizeCar(c.id, '#123456', c.mods, true); if (err) throw Error(err);
  });
  await wait(ready);
  assert.equal(await page.evaluate(async () => (await import('/src/state/vehicles.ts')).useVehicles.getState().cars[0].color), '#123456');
  const lastMove = await page.evaluate(async () => { const c = (await import('/src/state/vehicles.ts')).useVehicles.getState().cars[0]; c.x += 2; return { x: c.x, z: c.z }; });
  await leave(); assert.equal(relay.world().accounts[id].cars[0].x, lastMove.x, 'exit acknowledges final position');
  console.log('customization and exit passed');
  await join();
  await wait(async () => (await import('/src/state/vehicles.ts')).useVehicles.getState().cars.length === 1);
  assert.deepEqual(await position(), lastMove, 're-entry restores saved parking position');
  console.log('re-entry passed');
  assert.equal((await page.evaluate(async () => (await import('/src/state/vehicles.ts')).useVehicles.getState().cars[0])).id, carId);
  await page.evaluate(async () => { const e = (await import('/src/state/economy.ts')).useEconomy.getState(); const offer = e.offers.find(o => o.location === 'rural') || e.offers[0]; const err = e.buyLand(offer.id); if (err) throw Error(err); });
  await wait(async () => {
    const { savedBundle } = await import('/src/session/saves.ts');
    return (await import('/src/state/economy.ts')).useEconomy.getState().lots.some(l => l.owner === savedBundle().profile.id);
  });
  console.log('land purchase passed');
  await page.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().setOverlay('map'));
  await page.getByText('あなたの家・土地（1）', { exact: true }).waitFor();
  const ownList = page.locator('.map-mylots').filter({ hasText: 'あなたの家・土地' });
  assert.equal(await ownList.getByText('ほかの人の家', { exact: true }).count(), 0);
  await page.screenshot({ path: 'world-session-checks/ownership-mixed-desktop.png' });
  await page.keyboard.press('Escape'); await leave();
  await page.goto(base + '?touch=1&relay=' + encodeURIComponent(endpoint));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('あなたの名前').waitFor(); await join();
  await page.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().setOverlay('map'));
  await page.getByText('あなたの家・土地（1）', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'ほかの人の家', exact: true }).click();
  await page.getByText('所有者：ほかの人', { exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'world-session-checks/ownership-mobile.png' });
  await page.keyboard.press('Escape'); await leave();
  await page.getByRole('button', { name: 'ひとりで遊ぶ', exact: false }).click();
  const quote = { price: 100000, prevClose: 100000, currency: 'JPY', time: 1, intraday: [], daily: [] };
  const quotes = { updated: 1, quotes: { '^N225': quote } };
  await page.route('**/quotes.json*', route => route.fulfill({ json: quotes }));
  await page.evaluate(async quotes => {
    (await import('/src/state/stocks.ts')).useStocks.setState({ quotes, holdings: { '^N225': { units: 1, cost: 100000 } } });
    (await import('/src/state/store.ts')).useGame.getState().setOverlay('exchange');
  }, quotes);
  const before = await page.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.getState().money);
  await page.getByLabel(/売る口数/).fill('0.00001');
  await page.getByRole('button', { name: /^売る/ }).click();
  await page.getByText('0.0001口以上で入力してください', { exact: true }).waitFor();
  assert.equal(await page.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.getState().money), before);
  await page.getByLabel(/売る口数/).fill('0.0001');
  await page.getByRole('button', { name: /^売る/ }).click();
  assert.equal(await page.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.getState().money), before + 10);
  assert.equal(await page.evaluate(async () => (await import('/src/state/stocks.ts')).useStocks.getState().holdings['^N225'].units), 0.9999);
  assert.deepEqual(errors, []);
  console.log('Stock precision UI, shared car income/other player/reconnect/customization/exit/re-entry, desktop/mobile ownership passed');
} catch (error) {
  // Print focused diagnostics without dumping user save contents.
  console.error('Gameplay regression failed:', error);
  console.log('screen', await page.locator('body').innerText().catch(() => 'unavailable'));
  console.log('packets', JSON.stringify(trace.slice(-25)));
  console.log('state', await page.evaluate(async () => ({overlay:(await import('/src/state/store.ts')).useGame.getState().overlay,trace:window.__overlayTrace})).catch(()=>null));
  throw error;
} finally { await browser.close(); relay.close(); }
