// 地図で自分の土地が金色の庭・金枠・「あなたの土地」の札で目立つ（PC・スマホ）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const out = 'browser-checks/map-own-lot'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const errors = [];
try {
  for (const [name, viewport, touch] of [['pc', { width: 1280, height: 800 }, 0], ['phone', { width: 390, height: 844 }, 1], ['phone-land', { width: 844, height: 390 }, 1]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
    await page.goto((process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/') + `?touch=${touch}&play=1`);
    await page.waitForFunction(() => !!window.__ow);
    await page.evaluate(() => { window.__ow.economy.setState({ tick: () => {} }); window.__ow.game.setState({ mode: 'build', overlay: null }); });
    const owned = await page.evaluate(() => window.__ow.economy.getState().lots.filter(l => !l.town && typeof l.plot === 'number').length);
    await page.evaluate(() => window.__ow.game.getState().setOverlay('map'));
    await page.locator('.map-canvas svg').waitFor();
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ frames: document.querySelectorAll('.map-canvas .map-mine').length,
      plates: [...document.querySelectorAll('.map-canvas text')].filter(t => t.textContent === 'あなたの土地').length }));
    assert.ok(owned > 0 && r.frames === owned && r.plates === owned, JSON.stringify({ owned, ...r }));
    await page.screenshot({ path: `${out}/${name}.png` });
    // 札があっても下の区画はタップできる
    const lotName = await page.evaluate(() => { const l = window.__ow.economy.getState().lots.find(l => !l.town); return l.name.replace(/（.*）$/, ''); });
    await page.locator('.map-canvas svg').getByRole('button', { name: lotName, exact: true }).first().click();
    await page.locator('.map-pop').waitFor();
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('map own lot ok');
} finally { await browser.close(); }
