import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'plans', 'assets', 'game-ui-redesign');
await mkdir(outDir, { recursive: true });

const baseUrl = process.env.UI_SNAPSHOT_URL || 'http://127.0.0.1:5173/';
const prefix = process.env.SNAPSHOT_PREFIX || 'before';

const browser = await chromium.launch();

async function waitForAttached(page, selector, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.locator(selector).count() > 0) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`timeout waiting for ${selector}`);
}

async function captureDesktop() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForAttached(page, '.world-launch');
  await page.waitForTimeout(300);
  await page.locator('.world-choice.world-primary').click();
  await waitForAttached(page, '.topbar');
  await page.waitForTimeout(800);

  await page.screenshot({ path: join(outDir, `${prefix}-build-desktop.png`), fullPage: false });

  await page.locator('.tool.mode').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, `${prefix}-walk-desktop.png`), fullPage: false });

  await page.locator('.save > .tool').first().click();
  await waitForAttached(page, '.save-menu');
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, `${prefix}-save-desktop.png`), fullPage: false });

  await page.locator('.save > .tool').first().click();
  await page.waitForTimeout(200);
  await page.keyboard.press('m');
  await waitForAttached(page, '.map-modal');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, `${prefix}-map-desktop.png`), fullPage: false });

  await context.close();
}

async function captureMobile() {
  const context = await browser.newContext(devices['iPhone 12']);
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitForAttached(page, '.world-launch');
  await page.waitForTimeout(300);
  await page.locator('.world-choice.world-primary').click();
  await waitForAttached(page, '.app.touch');
  await page.waitForTimeout(800);

  await page.screenshot({ path: join(outDir, `${prefix}-build-mobile.png`), fullPage: false });

  await page.getByRole('button', { name: 'メニュー', exact: true }).click(); await page.getByRole('button', { name: '🚶 歩いてみる' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, `${prefix}-walk-mobile.png`), fullPage: false });

  await context.close();
}

await captureDesktop();
await captureMobile();
await browser.close();
console.log(`screenshots saved to ${outDir}`);
