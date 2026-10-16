import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const out = 'world-session-checks'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const errors = [];
const pages = [];
async function open(name) {
  const context = await browser.newContext({ viewport: { width: 900, height: 650 } }), page = await context.newPage();
  pages.push(page);
  page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?touch=0'); await page.getByLabel('あなたの名前').fill(name);
  return { context, page };
}
try {
  const { page: host } = await open('ホスト'), { page: guest } = await open('友達');
  await host.screenshot({ path: out + '/launcher.png' });
  const original = await guest.evaluate(async () => JSON.stringify((await import('/src/session/saves.ts')).savedBundle().home));
  await host.getByRole('button', { name: '自分のワールドを開く', exact: false }).click();
  await host.waitForFunction(async () => (await import('/src/session/session.ts')).useSession.getState().status === 'connected');
  const code = await host.evaluate(async () => (await import('/src/session/session.ts')).useSession.getState().code);
  await guest.getByLabel('招待コード').fill(code); await guest.getByRole('button', { name: '友達のワールドに入る', exact: true }).click();
  await guest.waitForFunction(async () => (await import('/src/session/session.ts')).useSession.getState().members.length === 2 && !!window.__ow);
  await guest.waitForFunction(() => !!window.__ow);
  await host.waitForFunction(() => !!window.__ow);
  const ids = await guest.evaluate(async () => ({ id: (await import('/src/session/saves.ts')).savedBundle().profile.id, n: window.__ow.game.getState().house.furniture.length }));
  await guest.evaluate(() => { const s = window.__ow.game.getState(), h = structuredClone(s.house); h.furniture.push({ ...h.furniture[0], id: 'permission-test' }); s.commit(h); });
  assert.equal(await guest.evaluate(() => window.__ow.game.getState().house.furniture.length), ids.n, 'guest cannot build before permission');
  await host.evaluate(async id => (await import('/src/session/session.ts')).allowBuilding(id, true), ids.id);
  await guest.waitForFunction(async id => (await import('/src/session/session.ts')).useSession.getState().members.some(m => m.id === id && m.canBuild), ids.id);
  const budget = await guest.evaluate(() => window.__ow.economy.getState().money);
  const cost = await guest.evaluate(async () => { const s = window.__ow.game.getState(), h = structuredClone(s.house); h.furniture.push({ ...h.furniture[0], id: 'guest-built', x: 2 });
    const cost = (await import('/src/economy/pricing.ts')).renovationCost(s.house, h).total; s.commit(h); return cost; });
  await host.waitForFunction(() => window.__ow?.game.getState().house.furniture.some(f => f.id === 'guest-built'));
  await guest.waitForFunction(async () => !(await import('/src/session/session.ts')).useSession.getState().busy && window.__ow.game.getState().house.furniture.some(f => f.id === 'guest-built'));
  assert.equal(await guest.evaluate(() => window.__ow.economy.getState().money), budget - cost, 'only builder pays');
  assert.equal(await guest.evaluate(async () => JSON.stringify((await import('/src/session/saves.ts')).savedBundle().home)), original, 'visiting never overwrites home');
  await host.waitForFunction(async () => Object.keys((await import('/src/session/session.ts')).useSession.getState().poses).length === 1);
  await host.screenshot({ path: out + '/host-and-guest.png' });
  await guest.evaluate(async () => (await import('/src/session/session.ts')).leaveWorld());
  await guest.getByRole('button', { name: 'ひとりで遊ぶ', exact: false }).waitFor();
  assert.equal(await guest.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().house.furniture.some(f => f.id === 'guest-built')), false, 'own house restored');
  await host.evaluate(async () => (await import('/src/session/session.ts')).leaveWorld());
  assert.equal(await host.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().house.furniture.some(f => f.id === 'guest-built')), true, 'friend construction remains in host world');
  const backup = await host.evaluate(async () => { const m = await import('/src/session/saves.ts'); await m.persist(); return JSON.stringify(m.snapshot()); });
  await host.evaluate(async backup => (await import('/src/session/saves.ts')).importSave(backup), backup);
  console.log(JSON.stringify({ code, cost, budget, result: 'join / permissions / build / payment / home isolation / presence / backup passed' }));
  assert.deepEqual(errors, []);
} catch (e) {
  console.log('browser errors', errors);
  for (const [i, page] of pages.entries()) { console.log('page', i, await page.locator('body').innerText()); await page.screenshot({ path: out + '/failure-' + i + '.png' }); }
  throw e;
} finally { await browser.close(); }
