import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';

const relay = createRelay(); await relay.ready;
await new Promise(resolve => relay.http.listen(0, '127.0.0.1', resolve));
const relayURL = 'ws://127.0.0.1:' + relay.http.address().port;
const base = process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const errors = [], automaticMessages = [], pages = [];
async function until(page, fn) {
  for (const end = Date.now() + 90000; Date.now() < end; await page.waitForTimeout(100)) if (await page.evaluate(fn)) return;
  throw Error('Automatic door condition timed out: ' + fn);
}
async function open(name) {
  const context = await browser.newContext({ viewport: { width: 680, height: 520 } });
  const page = await context.newPage(); pages.push(page); page.setDefaultTimeout(90000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('websocket', ws => ws.on('framesent', ({ payload }) => {
    try { const m = JSON.parse(payload); if (m.type === 'door' && m.id?.startsWith('venue:')) automaticMessages.push(m); } catch {}
  }));
  await page.goto(base + '?touch=0&relay=' + encodeURIComponent(relayURL));
  await page.getByLabel('あなたの名前').fill(name);
  await page.getByRole('button', { name: 'みんなのワールドで遊ぶ', exact: false }).click();
  await page.waitForFunction(() => !!window.__ow);
  return page;
}
async function walkToDoor(page) {
  await page.evaluate(() => window.__ow.game.setState({ mode: 'walk', overlay: null }));
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    const { civicOffset } = await import('/src/state/economy.ts');
    const { VENUES, VENUE_DOORS } = await import('/src/building/venues.ts');
    const o = civicOffset(); Object.assign(window.__ow.player, { x: o.x + VENUE_DOORS.estate.x, y: 0, z: o.z + VENUES.estate.z0 - 1 });
  });
}
const isOpen = async () => !!(await import('/src/state/doors.ts')).useDoors.getState().open['venue:estate'];
const isClosed = async () => !(await import('/src/state/doors.ts')).useDoors.getState().open['venue:estate'];
async function moveAway(page) { await page.evaluate(() => Object.assign(window.__ow.player, { x: 5, y: 0, z: 5 })); }
try {
  const a = await open('ドア確認A'), b = await open('ドア確認B');
  for (const page of pages) await until(page, async () => (await import('/src/session/session.ts')).useSession.getState().members.length === 2);
  await walkToDoor(a);
  for (const page of pages) await until(page, isOpen);
  // The other client remains in build mode and still sees a nearby pedestrian open the door.
  assert.equal(await b.evaluate(() => window.__ow.game.getState().mode), 'build');
  // A world snapshot may reset door state; local presence must immediately restore it.
  await b.evaluate(async () => {
    const { sessionGate } = await import('/src/session/gate.ts');
    sessionGate.applying = true;
    try { (await import('/src/state/doors.ts')).useDoors.setState({ open: {} }); }
    finally { sessionGate.applying = false; }
  });
  await until(b, isOpen);
  fs.mkdirSync('world-session-checks', { recursive: true });
  await a.screenshot({ path: 'world-session-checks/shared-auto-door.png' });
  await walkToDoor(b); await moveAway(a);
  for (const page of pages) await until(page, isOpen);
  await moveAway(b);
  for (const page of pages) await until(page, isClosed);
  // A stale physical position in build mode must not keep other clients' automatic doors open.
  await walkToDoor(a);
  for (const page of pages) await until(page, isOpen);
  await a.evaluate(() => window.__ow.game.setState({ mode: 'build' }));
  for (const page of pages) await until(page, isClosed);
  assert.deepEqual(automaticMessages, [], 'automatic doors are derived locally and never echoed through the relay');
  assert.deepEqual(errors, []);
  for (const page of pages) await page.evaluate(async () => (await import('/src/session/session.ts')).leaveWorld());
  console.log('Shared guests / remote pedestrian / snapshot recovery / second player remains / all leave / build mode / no door echo passed');
} catch (e) {
  console.error('Original door failure', e);
  console.log('Browser errors', errors);
  for (const [i, page] of pages.entries()) {
    try {
    console.log('Door diagnostic', i, await page.evaluate(async () => ({
      player: window.__ow?.player, mode: window.__ow?.game.getState().mode,
      doors: (await import('/src/state/doors.ts')).useDoors.getState().open,
      poses: (await import('/src/session/session.ts')).useSession.getState().poses,
    })));
    } catch (diagnostic) { console.log('Diagnostic unavailable', String(diagnostic)); }
  }
  throw e;
} finally { await browser.close(); relay.close(); }
