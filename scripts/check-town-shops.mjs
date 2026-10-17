import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
page.setDefaultTimeout(120000); const errors = []; page.on('pageerror', e => errors.push(e.message));
async function until(fn, arg) {
  for (const end = Date.now() + 60000; Date.now() < end; await page.waitForTimeout(100)) if (await page.evaluate(fn, arg)) return;
  throw Error('Shop condition timed out: ' + fn);
}
try {
  await page.goto((process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/') + '?touch=0&play=1');
  await page.waitForFunction(() => !!window.__ow);
  await page.evaluate(() => { window.__ow.economy.setState({ tick: () => {} }); window.__ow.game.setState({ mode: 'walk', overlay: null }); });
  await page.waitForTimeout(1000);
  const kinds = await page.evaluate(async () => (await import('/src/building/venues.ts')).VENUE_KINDS);
  for (const kind of kinds) {
    await page.evaluate(async k => {
      const { VENUE_DOORS, VENUES } = await import('/src/building/venues.ts');
      const o = (await import('/src/state/economy.ts')).civicOffset();
      Object.assign(window.__ow.player, { x: o.x + VENUE_DOORS[k].x, y: 0, z: o.z + VENUES[k].z0 - 1.8, yaw: Math.PI, bodyYaw: Math.PI });
    }, kind);
    await until(async k => !!(await import('/src/state/doors.ts')).useDoors.getState().open['venue:' + k], kind);
    await page.keyboard.down('KeyW'); await page.waitForTimeout(1300); await page.keyboard.up('KeyW');
    await until(async k => (await import('/src/state/venue.ts')).useVenue.getState().inside === k, kind);
    console.log('Entered', kind);
  }
  fs.mkdirSync('world-session-checks', { recursive: true });
  await page.evaluate(() => window.__ow.game.getState().setOverlay('map'));
  await page.getByRole('img', { name: '8ブロックに32区画が並ぶ町の地図' }).waitFor();
  await page.getByRole('button', { name: 'MAISON VÉRANE', exact: true }).click();
  assert.ok(await page.getByText('北のブティック通りにあります。中で服を選んで試着・購入できます。', { exact: true }).isVisible());
  await page.screenshot({ path: 'world-session-checks/distributed-shop-map.png' });
  assert.deepEqual(errors, []); console.log('All relocated shop entrances / doors / interiors / map passed');
} finally { await browser.close(); }
