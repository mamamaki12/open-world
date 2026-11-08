// 画質（高・中・低）：スマホは ☰ メニュー、PC は操作設定から選べて、低で解像度・影・フレーム数が下がり、再読み込み後も残る
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const out = 'browser-checks/graphics-quality'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const url = (process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/');
const errors = [];
const state = (page) => page.evaluate(async () => {
  const gl = window.__ow.gl, c = gl.domElement, f0 = gl.info.render.frame;
  await new Promise(r => setTimeout(r, 2000));
  let sunShadow = false; window.__ow.scene.traverse(o => { if (o.isDirectionalLight && o.castShadow) sunShadow = true; });
  return { ratio: c.width / c.clientWidth, shadows: gl.shadowMap.enabled, sunShadow, fps: (gl.info.render.frame - f0) / 2, saved: localStorage.getItem('open-world:graphics') };
});
try {
  // スマホ：初期は中。☰ → 低
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  let page = await ctx.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(url + '?touch=1&play=1');
  await page.waitForFunction(() => !!window.__ow?.gl);
  await page.evaluate(() => { window.__ow.economy.setState({ tick: () => {} }); window.__ow.game.setState({ mode: 'walk', overlay: null }); });
  const mid = await state(page);
  assert.ok(Math.abs(mid.ratio - 1.5) < 0.05 && mid.shadows && mid.sunShadow, JSON.stringify(mid));
  await page.getByRole('button', { name: 'メニュー', exact: true }).click();
  const picker = page.getByRole('radiogroup', { name: '画質' });
  await picker.getByRole('radio', { name: '低' }).click();
  await page.screenshot({ path: `${out}/phone-menu.png` });
  const low = await state(page);
  assert.ok(Math.abs(low.ratio - 0.75) < 0.05 && !low.shadows && !low.sunShadow && low.saved === 'low', JSON.stringify(low));
  assert.ok(low.fps <= 33, 'low fps cap ' + low.fps);
  await page.reload(); await page.waitForFunction(() => !!window.__ow?.gl);
  await page.evaluate(() => window.__ow.game.setState({ mode: 'walk', overlay: null }));
  const again = await state(page);
  assert.ok(Math.abs(again.ratio - 0.75) < 0.05 && !again.shadows, 'persist ' + JSON.stringify(again));
  await page.screenshot({ path: `${out}/phone-low.png` });
  await ctx.close();

  // PC：初期は高。操作設定 → 低 → 高
  const pc = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  page = await pc.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(url + '?touch=0&play=1');
  await page.waitForFunction(() => !!window.__ow?.gl);
  await page.evaluate(() => { window.__ow.economy.setState({ tick: () => {} }); window.__ow.game.setState({ mode: 'walk', overlay: null }); });
  const high = await state(page);
  assert.ok(Math.abs(high.ratio - 2) < 0.05 && high.shadows, JSON.stringify(high));
  await page.getByRole('button', { name: '操作設定', exact: true }).first().click();
  await page.getByRole('radiogroup', { name: '画質' }).getByRole('radio', { name: '低' }).click();
  await page.screenshot({ path: `${out}/pc-settings.png` });
  await page.getByRole('radiogroup', { name: '画質' }).getByRole('radio', { name: '高' }).click();
  await page.evaluate(() => window.__ow.game.getState().setOverlay(null));
  const back = await state(page);
  assert.ok(Math.abs(back.ratio - 2) < 0.05 && back.shadows && back.sunShadow && back.saved === 'high', JSON.stringify(back));
  await pc.close();
  assert.deepEqual(errors, []);
  console.log('graphics quality ok', JSON.stringify({ mid, low, again, high }));
} finally { await browser.close(); }
