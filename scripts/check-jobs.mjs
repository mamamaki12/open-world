// バイトのミニゲームを開き、4種類を少し遊んで給料が入ることを確かめる
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const tag = process.argv[2] ?? 'pc';
const out = process.argv[3] ?? 'job-checks';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: tag === 'phone' ? { width: 390, height: 844 } : { width: 1280, height: 800 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.setDefaultTimeout(90000);
await page.goto(`http://127.0.0.1:5173/?play=1&touch=${tag === 'phone' ? 1 : 0}`);
await page.waitForFunction(() => window.__ow);
await page.clock.install();
await page.evaluate(() => window.__ow.game.getState().setOverlay('jobs'));
const money = () => page.evaluate(() => window.__ow.economy.getState().money);
const finish = async (name) => {
  await page.clock.runFor(61000);
  await page.screenshot({ path: `${out}/jobs-${tag}-${name}-done.png` });
  const before = await money();
  await page.getByRole('button', { name: '給料を受け取る' }).click();
  assert.ok((await money()) > before, `${name}: pay received`);
  await page.getByRole('button', { name: 'ほかのバイトを見る' }).click();
};
await page.screenshot({ path: `${out}/jobs-${tag}-list.png` });
// レジ：正しいおつりを渡す
await page.locator('.job-card', { hasText: 'コンビニのレジ' }).click();
while (await page.getByRole('button', { name: /^ピッ/ }).count()) await page.getByRole('button', { name: /^ピッ/ }).click();
const rows = await page.locator('.receipt-row span:last-child').allTextContents();
const nums = rows.map((t) => Number(t.replace(/[^\d]/g, '')));
let change = nums[nums.length - 1] - nums[nums.length - 2];
for (const d of [10000, 5000, 1000, 500, 100, 50, 10, 5, 1]) while (change >= d) { await page.getByRole('button', { name: new RegExp(`^${d.toLocaleString()}円`) }).click(); change -= d; }
await page.screenshot({ path: `${out}/jobs-${tag}-register.png` });
await page.getByRole('button', { name: '渡す' }).click();
assert.match(await page.locator('.job-head').textContent(), /できた 1・ミス 0/);
await finish('register');
// 仕分け
await page.locator('.job-card', { hasText: '倉庫' }).click();
await page.getByRole('button', { name: '関東' }).click();
await page.screenshot({ path: `${out}/jobs-${tag}-warehouse.png` });
await finish('warehouse');
// バーガー：注文票どおりに積む
await page.locator('.job-card', { hasText: 'ハンバーガー' }).click();
for (const l of await page.locator('.order-ticket li').allTextContents()) await page.locator('.burger .coin', { hasText: new RegExp(`^${l}$`) }).click();
await page.screenshot({ path: `${out}/jobs-${tag}-burger.png` });
await page.getByRole('button', { name: /出す/ }).click();
assert.match(await page.locator('.job-head').textContent(), /できた 1・ミス 0/);
await finish('burger');
// 交通量調査
await page.locator('.job-card', { hasText: '交通量' }).click();
await page.clock.runFor(6000);
await page.getByRole('button', { name: /^乗用車/ }).click();
await page.screenshot({ path: `${out}/jobs-${tag}-traffic.png` });
await finish('traffic');
assert.deepEqual(errors, []);
await browser.close();
console.log('jobs ok', tag);
