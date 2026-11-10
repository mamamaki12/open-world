// 普通のスマホ縦横・タブレット・PCの大きさで、すべてのパネル（とその中のタブ）・運転中・歩く画面のメニューを開き、
// 文字やボタンが重なっていないか・画面外へはみ出していないかを調べる（しんご 2026-11-10「徹底的に確認して修正」）。
// 道具ごとの歩く・建築画面は check-hud-overlap.mjs、文字の拡大は check-large-text.mjs が見る。
import fs from 'node:fs';
import { chromium } from 'playwright';
import { scan } from './layout-scan.mjs';

const base = process.env.UI_SNAPSHOT_URL || `http://127.0.0.1:${process.env.QA_PORT || 5173}/`;
const out = 'browser-checks/ui-overlap-all'; fs.mkdirSync(out, { recursive: true });
const sizes = [
  { name: 'phone-390x844', viewport: { width: 390, height: 844 }, touch: true },
  { name: 'phone-320x568', viewport: { width: 320, height: 568 }, touch: true },
  { name: 'phone-844x390', viewport: { width: 844, height: 390 }, touch: true },
  { name: 'phone-568x320', viewport: { width: 568, height: 320 }, touch: true },
  { name: 'tablet-1024x768', viewport: { width: 1024, height: 768 }, touch: true },
  { name: 'pc-1280x720', viewport: { width: 1280, height: 720 } },
  { name: 'pc-1440x900', viewport: { width: 1440, height: 900 } },
];
const overlays = ['estate', 'casino', 'map', 'dealer', 'tuner', 'exchange', 'land', 'controls', 'inventory', 'boutique', 'closet', 'jobs', 'shop', 'requests', 'arcade', 'ride', 'looks', 'looks-edit', 'salon', 'designer', 'quests', 'photo', 'blueprints', 'ranking'];
const only = process.env.SIZES?.split(',');
const onlyOv = process.env.OVERLAYS?.split(',');

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = 0;
const report = {};
for (const size of sizes) {
  if (only && !only.includes(size.name)) continue;
  const context = await browser.newContext({ viewport: size.viewport, hasTouch: !!size.touch, isMobile: !!size.touch });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  const check = async (step, root = 'body') => {
    await page.waitForTimeout(500);
    const bad = await page.evaluate(scan, root);
    report[size.name + ' ' + step] = bad;
    if (bad.length) { failed++; console.log('NG', size.name, step, '\n  ' + bad.join('\n  ')); await page.screenshot({ path: `${out}/${size.name}-${step}.png` }); }
    else { console.log('ok', size.name, step); if (process.env.SHOTS) await page.screenshot({ path: `${out}/${size.name}-${step}.png` }); }
  };
  const game = (fn, arg) => page.evaluate(fn, arg);
  try {
    await page.goto(`${base}?play=1${size.touch ? '&touch=1' : ''}`);
    await page.waitForFunction(() => window.__ow);
    await game(() => { window.__ow.economy.setState({ money: 30000000 }); const g = window.__ow.game.getState(); g.setOverlay(null); g.setMode('walk'); });
    await page.waitForTimeout(1500);
    await check('walk');
    if (size.touch) {
      const m = page.getByRole('button', { name: 'メニュー', exact: true });
      if (await m.count()) { await m.first().click(); await check('walk-menu'); await m.first().click(); }
    }
    for (const o of overlays) {
      if (onlyOv && !onlyOv.includes(o)) continue;
      try {
        await game((o) => { const g = window.__ow.game.getState(); g.setOverlay(null); g.setOverlay(o); }, o);
        await page.waitForTimeout(700);
        const root = await page.locator('.overlay').count() ? '.overlay' : 'body';
        await check(o, root);
        const tabs = page.locator('.overlay .modal-tabs > button');
        const n = await tabs.count();
        for (let i = 1; i < n; i++) {
          const name = (await tabs.nth(i).textContent()).trim().replace(/\s+/g, '');
          await tabs.nth(i).click();
          await check(`${o}-${i}-${name}`, '.overlay');
        }
        // カジノのゲーム・バイトの仕事は、カードを1つずつ開いて中の画面も見る
        const cards = page.locator('.overlay .casino-game-card, .overlay .job-card');
        const m = await cards.count();
        for (let i = 0; i < m; i++) {
          await game(() => window.__ow.game.getState().setOverlay(null)); await page.waitForTimeout(200);
          await game((o) => window.__ow.game.getState().setOverlay(o), o); await page.waitForTimeout(500);
          const card = page.locator('.overlay .casino-game-card, .overlay .job-card').nth(i);
          const name = (await card.textContent()).trim().replace(/\s+/g, '').slice(0, 8);
          await card.click();
          await check(`${o}-card${i}-${name}`, '.overlay');
        }
      } catch (e) { failed++; console.log('ERROR', size.name, o, e.message.split('\n')[0]); }
    }
    await game(() => window.__ow.game.getState().setOverlay(null));
    // 運転中（三人称・運転席）
    await page.evaluate(async () => { const { buyCar, useVehicles } = await import('/src/state/vehicles.ts'); useVehicles.setState({ cars: [], driving: null }); buyCar('aria', '#204f7b', true); useVehicles.setState({ driving: useVehicles.getState().cars[0].id }); });
    await page.waitForTimeout(1200);
    await check('drive');
    await game(() => window.__ow.game.setState({ view: 'first' }));
    await check('drive-first');
    await page.evaluate(async () => { const { useVehicles } = await import('/src/state/vehicles.ts'); useVehicles.setState({ driving: null }); window.__ow.game.setState({ view: 'third' }); });
  } catch (e) { failed++; console.log('ERROR', size.name, e.message.split('\n')[0]); await page.screenshot({ path: `${out}/${size.name}-error.png` }).catch(() => {}); }
  finally { await context.close(); }
}
await browser.close();
fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
console.log(failed ? `${failed} screens with layout problems` : 'UI overlap (all panels): all screens ok');
process.exitCode = failed ? 1 : 0;
