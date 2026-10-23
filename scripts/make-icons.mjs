// public/icon.svg と public/icon-maskable.svg から、ホーム画面用の PNG アイコンを作り直す
// 使い方: node scripts/make-icons.mjs （Playwright の Chromium を使う）
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const dir = new URL('../public/', import.meta.url).pathname;
const icons = [
  ['apple-touch-icon.png', 180, 'icon.svg'],
  ['icon-192.png', 192, 'icon.svg'],
  ['icon-512.png', 512, 'icon.svg'],
  // Android で丸や角丸に切り抜かれても欠けないよう、主要な絵を中央の安全円（半径40%）に収めた版
  ['icon-maskable-512.png', 512, 'icon-maskable.svg'],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, src] of icons) {
  const svg = readFileSync(dir + src, 'utf8').replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: dir + name, clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
