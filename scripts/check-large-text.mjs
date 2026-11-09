// ページ拡大（PCのCtrl+、iOSのaA、Androidの表示サイズ）で文字が大きくなった時に
// ボタンや文字が重なったり画面外へはみ出したりしないかを検査する。
// 拡大はCSS上の画面幅が狭くなるのと同じなので、縮小viewport + deviceScaleFactorで再現する。
import fs from 'node:fs';
import { chromium } from 'playwright';
import { scan } from './layout-scan.mjs';

const base = process.env.UI_SNAPSHOT_URL || 'http://127.0.0.1:5173/';
const out = 'browser-checks/large-text'; fs.mkdirSync(out, { recursive: true });
const sizes = [
  { name: 'pc-100', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
  { name: 'pc-1024', viewport: { width: 1024, height: 700 }, deviceScaleFactor: 1 },
  { name: 'pc-150', viewport: { width: 853, height: 480 }, deviceScaleFactor: 1.5 },
  { name: 'pc-200', viewport: { width: 640, height: 360 }, deviceScaleFactor: 2 },
  { name: 'phone-150', viewport: { width: 260, height: 563 }, deviceScaleFactor: 3, touch: true },
  { name: 'phone-land-150', viewport: { width: 563, height: 260 }, deviceScaleFactor: 3, touch: true },
];
const only = process.env.SIZES?.split(',');

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = {};
let failed = 0;
for (const size of sizes) {
  if (only && !only.includes(size.name)) continue;
  const context = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: size.deviceScaleFactor, hasTouch: !!size.touch, isMobile: !!size.touch });
  const page = await context.newPage();
  const check = async (step, root = 'body') => {
    await page.waitForTimeout(400);
    const bad = await page.evaluate(scan, root);
    report[size.name + ' ' + step] = bad;
    await page.screenshot({ path: `${out}/${size.name}-${step}.png` });
    if (bad.length) { failed++; console.log('NG', size.name, step, '\n  ' + bad.join('\n  ')); } else console.log('ok', size.name, step);
  };
  const click = async (loc) => { if (await loc.count()) { await loc.first().click(); return true; } console.log('  (skip: not found)'); return false; };
  try {
    await page.goto(base + (size.touch ? '?touch=1' : ''));
    await page.locator('.world-launch').waitFor();
    await check('launcher');
    await page.locator('.world-choice.world-primary').click();
    await page.locator('.app').waitFor();
    await page.waitForTimeout(1000);
    await check('build');
    for (const [step, open, root] of extraSteps(size)) {
      try { if (await open(page, click)) await check(step, root); }
      catch (e) { console.log('  step error', step, e.message.split('\n')[0]); }
      await page.keyboard.press('Escape').catch(() => {});
    }
  } catch (e) {
    console.log('ERROR', size.name, e.message); failed++;
    await page.screenshot({ path: `${out}/${size.name}-error.png` }).catch(() => {});
  } finally { await context.close(); }
}
await browser.close();
fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
console.log(failed ? `${failed} screens with layout problems` : 'all screens ok');
process.exitCode = failed ? 1 : 0;

function extraSteps(size) {
  const menu = async (page, click) => size.touch ? click(page.getByRole('button', { name: 'メニュー', exact: true })) : click(page.locator('.save > .tool'));
  const overlay = (name) => async (page) => { await page.evaluate(async (o) => { const { useGame } = await import('/src/state/store.ts'); useGame.getState().setOverlay(o); }, name); await page.waitForTimeout(600); return await page.locator('.overlay').count() > 0; };
  const close = async (page) => { await page.evaluate(async () => { const { useGame } = await import('/src/state/store.ts'); useGame.getState().setOverlay(null); }); };
  const steps = [['menu', menu, 'body']];
  if (!size.touch) steps.push(['floor-tool', async (page, click) => { await click(page.locator('.save > .tool')); return click(page.getByRole('button', { name: '床', exact: true })); }, 'body']);
  else steps.push(['build-sheet', async (page, click) => { const m = page.getByRole('button', { name: 'メニュー', exact: true }); if (await m.getAttribute('aria-expanded') === 'true') await m.click(); return click(page.getByRole('button', { name: /建てる/ })); }, 'body']);
  steps.push(['walk', async (page, click) => {
    if (size.touch) { const m = page.getByRole('button', { name: 'メニュー', exact: true }); if (await m.getAttribute('aria-expanded') !== 'true') await m.click(); return click(page.getByRole('button', { name: '歩いてみる' })); }
    return click(page.getByRole('button', { name: /歩いてみる/ }));
  }, 'body']);
  steps.push(['walk-menu', async (page, click) => size.touch ? click(page.getByRole('button', { name: 'メニュー', exact: true })) : false, 'body']);
  for (const o of ['estate', 'casino', 'map', 'jobs', 'dealer', 'exchange', 'closet', 'looks-edit', 'salon', 'controls', 'inventory']) steps.push([o, async (page) => { await close(page); return overlay(o)(page); }, '.overlay']);
  return steps;
}
