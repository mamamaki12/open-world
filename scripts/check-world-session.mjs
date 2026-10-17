import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';
const relay = createRelay(); await new Promise(resolve => relay.http.listen(0, '127.0.0.1', resolve));
const relayURL = 'ws://127.0.0.1:' + relay.http.address().port;
let interruptNextEdit = false;
relay.wss.on('connection', socket => socket.on('message', raw => {
  const data = JSON.parse(raw.toString()); if (interruptNextEdit && data.type === 'command') { interruptNextEdit = false; socket.terminate(); }
}));
const out = 'world-session-checks'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const errors = [];
const pages = [];
async function open(name) {
  const context = await browser.newContext({ viewport: { width: 900, height: 650 } }), page = await context.newPage();
  pages.push(page);
  page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?touch=0&relay=' + encodeURIComponent(relayURL)); await page.getByLabel('あなたの名前').fill(name);
  // Keep quotes stable while software-rendered CI browsers take different amounts of time.
  // Shared clock delivery is verified explicitly below; economic ticking has unit coverage.
  await page.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.setState({ tick: () => {} }));
  return { context, page };
}
/** ページ内の async な判定が true になるまで待つ */
async function until(page, fn, arg) {
  for (const end = Date.now() + 120000; Date.now() < end; await page.waitForTimeout(100)) if (await page.evaluate(fn, arg)) return;
  throw Error('timed out waiting for ' + fn);
}
try {
  const { page: host } = await open('ホスト'), { page: guest } = await open('友達');
  await host.screenshot({ path: out + '/launcher.png' });
  const original = await guest.evaluate(async () => JSON.stringify((await import('/src/session/saves.ts')).savedBundle().home));
  const money = page => page.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.getState().money);
  const homeMoney = await money(guest);
  for (const page of [host, guest]) await page.getByRole('button', { name: 'みんなのワールドで遊ぶ', exact: false }).click();
  for (const page of [host, guest]) await page.waitForFunction(async () => (await import('/src/session/session.ts')).useSession.getState().members.length === 2 && !!window.__ow);
  const code = 'SHARED';
  const S = '/src/session/session.ts';
  for (const page of [host, guest]) await page.waitForFunction(() => window.__ow?.economy.getState().money === 1000000);
  assert.equal(await guest.evaluate(() => window.__ow?.economy.getState().lots.length), 0, 'shared world starts without land');
  assert.equal(await guest.evaluate(async () => (await import('/src/state/vehicles.ts')).useVehicles.getState().cars.length), 0, 'home cars stay home');
  // 稼いだ想定でお金を入れ、不動産屋で土地を買う
  await guest.evaluate(() => window.__ow?.economy.getState().receive(50000000, 'テスト'));
  await guest.waitForFunction(async S => { const m = await import(S); return !m.useSession.getState().busy; }, S);
  const offer = await guest.evaluate(() => window.__ow?.economy.getState().offers[0].id);
  assert.equal(await guest.evaluate(o => window.__ow?.economy.getState().buyLand(o), offer), null);
  await guest.waitForFunction(() => window.__ow?.economy.getState().lots.length === 1);
  await host.waitForFunction(() => window.__ow?.economy.getState().lots.length === 1);
  const ids = await guest.evaluate(async () => ({ id: (await import('/src/session/saves.ts')).savedBundle().profile.id, lot: window.__ow?.economy.getState().lots[0].id }));
  assert.equal(await host.evaluate(() => window.__ow?.economy.getState().lots[0].ownerName), '友達');
  const budget = await money(guest);
  assert.ok(budget < 51000000, 'land was paid');
  const template = await guest.evaluate(async () => (await import('/src/session/saves.ts')).savedBundle().home.house.furniture[0]);
  assert.ok(template, 'home sample house has furniture');
  const add = (page, id, x) => page.evaluate(({ id, x, template }) => { const s = window.__ow?.game.getState(), h = structuredClone(s.house); h.furniture.push({ ...template, id, x }); s.commit(h); }, { id, x, template });
  await add(guest, 'guest-built', 4);
  await host.waitForFunction(() => window.__ow?.game.getState().house.furniture.some(f => f.id === 'guest-built'));
  await guest.waitForFunction(async S => !(await import(S)).useSession.getState().busy, S);
  assert.equal(await money(guest), budget, 'building is free');
  assert.equal(await guest.evaluate(async () => JSON.stringify((await import('/src/session/saves.ts')).savedBundle().home)), original, 'visiting never overwrites home');
  await add(host, 'host-intrusion', 5);
  await host.waitForFunction(() => !window.__ow?.game.getState().house.furniture.some(f => f.id === 'host-intrusion'));
  interruptNextEdit = true;
  await add(guest, 'reconnected-build', 6);
  await guest.waitForFunction(async S => { const m = await import(S); return m.useSession.getState().status === 'connected' && !m.useSession.getState().busy; }, S);
  await guest.waitForFunction(() => window.__ow?.game.getState().house.furniture.some(f => f.id === 'reconnected-build'));
  await guest.evaluate(() => window.__ow?.game.getState().undo());
  await host.waitForFunction(() => !window.__ow?.game.getState().house.furniture.some(f => f.id === 'reconnected-build'));
  // 売りに出して、もう一人が買う。代金は買った人から売り手へ移る
  await guest.evaluate(lot => import('/src/session/gate.ts').then(g => g.sessionGate.act(lot, { type: 'list', price: 3000000 }, 0)), ids.lot);
  await host.waitForFunction(() => window.__ow?.economy.getState().lots[0].listing?.price === 3000000);
  await host.evaluate(() => window.__ow?.economy.getState().receive(5000000, 'テスト'));
  await host.waitForFunction(() => window.__ow?.economy.getState().money === 6000000);
  await host.evaluate(lot => import('/src/session/gate.ts').then(g => g.sessionGate.act(lot, { type: 'buyLot' }, 3000000)), ids.lot);
  await host.waitForFunction(() => window.__ow?.economy.getState().money === 3000000);
  await guest.waitForFunction(b => window.__ow?.economy.getState().money === b + 3000000, budget);
  await guest.waitForFunction(() => window.__ow?.economy.getState().lots[0].ownerName === 'ホスト');
  const clock = await guest.evaluate(() => window.__ow?.economy.getState().clock);
  await guest.waitForFunction(c => window.__ow?.economy.getState().clock !== c, clock);
  await host.waitForFunction(async S => Object.keys((await import(S)).useSession.getState().poses).length === 1, S);
  await host.screenshot({ path: out + '/host-and-guest.png' });
  await guest.evaluate(async S => (await import(S)).leaveWorld(), S);
  await guest.getByRole('button', { name: 'ひとりで遊ぶ', exact: false }).waitFor();
  assert.equal(await money(guest), homeMoney, 'shared money never reaches home');
  assert.equal(await guest.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().house.furniture.some(f => f.id === 'guest-built')), false, 'own house restored');
  await host.evaluate(async S => (await import(S)).leaveWorld(), S);
  await host.getByRole('button', { name: 'みんなのワールドで遊ぶ', exact: false }).click();
  await host.waitForFunction(() => window.__ow?.game.getState().house.furniture.some(f => f.id === 'guest-built'));
  assert.equal(await money(host), 3000000, 'shared balance kept on the server');
  await host.evaluate(async S => (await import(S)).leaveWorld(), S);
  const backup = await host.evaluate(async () => { const m = await import('/src/session/saves.ts'); await m.persist(); return JSON.stringify(m.snapshot()); });
  await host.evaluate(async backup => (await import('/src/session/saves.ts')).importSave(backup), backup);
  console.log(JSON.stringify({ code, budget, result: 'shared join / land / free build / owner-only / reconnect / sale between players / separate money / persistence / backup passed' }));
  assert.deepEqual(errors, []);
} catch (e) {
  console.log('browser errors', errors);
  for (const [i, page] of pages.entries()) { console.log('page', i, await page.locator('body').innerText());
    console.log('session', await page.evaluate(async () => ({ state: (await import('/src/session/session.ts')).useSession.getState(), inputs: [...document.querySelectorAll('input')].map(i => ({ value: i.value, type: i.type })) })));
    await page.screenshot({ path: out + '/failure-' + i + '.png' }); }
  throw e;
} finally { await browser.close(); relay.close(); }
