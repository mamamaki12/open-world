import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
fs.mkdirSync('world-session-checks', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), page = await context.newPage(), errors = [];
  page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/'); await page.getByLabel('あなたの名前').waitFor();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByLabel('あなたの名前').fill('オフラインの住人');
  await page.getByRole('button', { name: 'ひとりで遊ぶ', exact: false }).click(); await page.locator('canvas').waitFor();
  await page.getByRole('button', { name: 'ひとりでプレイ中' }).click();
  await page.getByRole('button', { name: '保存して開始画面へ' }).click();
  await page.getByLabel('あなたの名前').waitFor();
  await context.setOffline(true); await page.reload();
  await page.getByLabel('あなたの名前').waitFor(); assert.equal(await page.getByLabel('あなたの名前').inputValue(), 'オフラインの住人');
  await page.screenshot({ path: 'world-session-checks/mobile-offline-menu.png' });
  await page.getByRole('button', { name: 'ひとりで遊ぶ', exact: false }).click(); await page.locator('canvas').waitFor();
  await page.screenshot({ path: 'world-session-checks/mobile-offline-game.png' });
  assert.deepEqual(errors, []); console.log('production offline reload, saved profile and game launch passed');
} finally { await browser.close(); }
