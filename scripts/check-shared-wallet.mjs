import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';
const relay = createRelay(); await relay.ready;
await new Promise(r => relay.http.listen(0, '127.0.0.1', r));
let interrupt = false;
relay.wss.on('connection', socket => socket.on('message', raw => {
  const m = JSON.parse(raw.toString());
  if (interrupt && m.type === 'command' && m.command?.action?.type === 'money') { interrupt = false; socket.terminate(); }
}));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const base = process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/';
const url = base + '?touch=0&relay=' + encodeURIComponent('ws://127.0.0.1:' + relay.http.address().port);
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 680, height: 520 } }), page = await ctx.newPage();
page.on('pageerror', e => { errors.push(e.message); console.log('pageerror', e.message); }); page.setDefaultTimeout(120000);
page.on('websocket', ws => {
  ws.on('framereceived', ({ payload }) => { const m = JSON.parse(String(payload)); if (['error','account','result','welcome'].includes(m.type)) console.log('relay', m.type, m.account?.money, m.result, m.message); });
  ws.on('framesent', ({ payload }) => { const m = JSON.parse(String(payload)); if (m.type === 'command') console.log('command', m.command.id, m.command.action); });
});
async function until(fn) {
  for (const end = Date.now() + 120000; Date.now() < end; await page.waitForTimeout(100)) if (await page.evaluate(fn)) return;
  throw Error('Wallet condition timed out: ' + fn);
}
const ready = async () => {
  const { useSession } = await import('/src/session/session.ts'), { savedBundle } = await import('/src/session/saves.ts');
  return useSession.getState().status === 'connected' && !!savedBundle().wallet && !savedBundle().wallet.pending.length;
};
const money = () => page.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.getState().money);
const change = delta => page.evaluate(async d => {
  const e = (await import('/src/state/economy.ts')).useEconomy.getState();
  if (d > 0) e.receive(d, 'wallet test'); else assertPay(e.pay(-d, 'wallet test'));
  function assertPay(ok) { if (!ok) throw Error('Payment rejected'); }
}, delta);
const join = async () => { await page.getByRole('button', { name: 'みんなのワールドで遊ぶ', exact: false }).click(); await until(ready); };
const leave = async () => {
  await page.evaluate(async () => (await import('/src/session/session.ts')).leaveWorld());
  await page.getByRole('button', { name: 'ひとりで遊ぶ', exact: false }).waitFor();
};
try {
  await page.goto(url);
  await page.getByLabel('あなたの名前').fill('共通財布');
  await page.evaluate(async () => {
    (await import('/src/state/economy.ts')).useEconomy.setState({ money: 2345678, tick: () => {} });
    Object.assign((await import('/src/world/Player.tsx')).playerMemory, { x: 7, z: 9 });
  });
  console.log('joining first'); await join(); console.log('joined first');
  assert.equal(await money(), 2345678, 'personal money replaces old shared money exactly once');
  assert.equal(await page.evaluate(() => window.__ow.game.getState().mode), 'walk');
  assert.ok(await page.evaluate(async () => {
    const o = (await import('/src/state/economy.ts')).civicOffset();
    const { VENUES, VENUE_DOORS } = await import('/src/building/venues.ts'), p = window.__ow.player;
    return Math.abs(p.x - o.x - VENUE_DOORS.casino.x) < .1 && Math.abs(p.z - o.z - VENUES.casino.z0 + 2.5) < .1;
  }), 'shared spawn is in front of casino');
  await change(-1000); await until(ready); await leave(); assert.equal(await money(), 2344678);
  assert.equal(await page.evaluate(async () => (await import('/src/world/Player.tsx')).playerMemory.x), 7, 'home position restored');
  await page.getByRole('button', { name: 'ひとりで遊ぶ', exact: false }).click();
  await change(500); await change(-200); await leave(); await join();
  assert.equal(await money(), 2344978, 'offline earnings and spending sync in both directions');
  // Drop the connection immediately after submitting a payment. The receipt must prevent double application.
  await page.evaluate(() => Object.assign(window.__ow.player, { x: 5, z: 5 }));
  interrupt = true; await change(1234); await page.waitForTimeout(3000); await until(ready);
  assert.equal(await money(), 2346212);
  assert.ok(await page.evaluate(() => Math.abs(window.__ow.player.x - 5) < .1), 'reconnect does not respawn');
  await leave();
  await page.getByRole('button', { name: 'ひとりで遊ぶ', exact: false }).click();
  await change(4321); await page.evaluate(async () => (await import('/src/session/saves.ts')).persist());
  await page.reload(); await page.getByLabel('あなたの名前').waitFor();
  await page.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.setState({ tick: () => {} }));
  await join(); assert.equal(await money(), 2350533, 'offline journal survives reload');
  await leave(); await join(); assert.equal(await money(), 2350533, 'no repeated migration or replay');
  await leave(); assert.deepEqual(errors, []);
  console.log('Common wallet / casino spawn / home restoration / offline journal / interrupted acknowledgement / reload / no double credit passed');
} catch (e) {
  console.error(e);
  try { console.log('body', await page.locator('body').innerText()); console.log(await page.evaluate(async () => ({ save: (await import('/src/session/saves.ts')).savedBundle(), session: (await import('/src/session/session.ts')).useSession.getState() }))); } catch (d) {console.log('diagnostic error',String(d));}
  throw e;
} finally { await browser.close(); relay.close(); }
