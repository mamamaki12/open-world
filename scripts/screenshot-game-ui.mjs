import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'plans', 'assets', 'game-ui-redesign');
await mkdir(outDir, { recursive: true });

const baseUrl = process.env.UI_SNAPSHOT_URL || 'http://127.0.0.1:5173/';
const prefix = process.env.SNAPSHOT_PREFIX || 'before';

const browser = await chromium.launch();
const shots = [
  { name: 'desktop', context: { viewport: { width: 1280, height: 800 } } },
  { name: 'mobile', context: devices['iPhone 12'] },
];

for (const { name, context: ctx } of shots) {
  const context = await browser.newContext(ctx);
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('.world-launch', { state: 'visible' });
  // ロゴや背景アニメーションが落ち着くまで少し待つ
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(outDir, `${prefix}-launcher-${name}.png`),
    fullPage: false,
  });

  // 接続設定を展開
  const details = page.locator('.world-card details');
  if (await details.count()) {
    await details.locator('summary').click();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: join(outDir, `${prefix}-settings-${name}.png`),
      fullPage: false,
    });
  }
  await context.close();
}

await browser.close();
console.log(`screenshots saved to ${outDir}`);
