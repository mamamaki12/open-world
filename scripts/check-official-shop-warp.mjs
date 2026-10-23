// 地図の「公式のお店」から各店の入口前へワープできる（PC・スマホ）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const out = 'browser-checks/official-shop-warp'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const errors = [];
try {
  for (const [name, viewport, touch] of [['pc', { width: 1280, height: 800 }, 0], ['phone', { width: 390, height: 844 }, 1]]) {
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
    await page.goto((process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/') + `?touch=${touch}&play=1`);
    await page.waitForFunction(() => !!window.__ow);
    await page.evaluate(() => { window.__ow.economy.setState({ tick: () => {} }); window.__ow.game.setState({ mode: 'build', overlay: null }); });
    const kinds = await page.evaluate(async () => (await import('/src/building/venues.ts')).VENUE_KINDS);
    for (const kind of kinds) {
      await page.evaluate(() => window.__ow.game.getState().setOverlay('map'));
      const label = await page.evaluate(async k => (await import('/src/building/venues.ts')).VENUES[k].name, kind);
      const row = page.locator('.map-official li').filter({ hasText: label });
      await row.getByRole('button', { name: 'ワープ', exact: true }).click();
      const r = await page.evaluate(async k => {
        const { venueEntrance } = await import('/src/building/venues.ts');
        const o = (await import('/src/state/economy.ts')).civicOffset(), p = venueEntrance(k, 3), g = window.__ow.game.getState();
        return { d: Math.hypot(window.__ow.player.x - o.x - p.x, window.__ow.player.z - o.z - p.z), mode: g.mode, overlay: g.overlay };
      }, kind);
      assert.ok(r.d < 1.5 && r.mode === 'walk' && !r.overlay, `${label} ${kind} ${JSON.stringify(r)}`);
      if (kind === 'casino' || kind === 'maison') { await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/${name}-${kind}.png` }); }
    }
    await page.evaluate(() => window.__ow.game.getState().setOverlay('map'));
    await page.getByRole('button', { name: 'まちの不動産', exact: true }).first().click();
    await page.screenshot({ path: `${out}/${name}-map.png` });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('official shop warp ok');
} finally { await browser.close(); }
