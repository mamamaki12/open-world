// みんなのワールドの画面（👥人数チップあり）で、スマホ縦横・PCの各サイズ・道具ごとに
// 文字やボタンが重なっていないかを調べる。歩く画面で家具を持つと「配置」に👥が重なっていた（2026-11-09）。
import fs from 'node:fs';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';
import { scan } from './layout-scan.mjs';

const relay = createRelay(); await relay.ready; await new Promise(r => relay.http.listen(0, '127.0.0.1', r));
const base = process.env.UI_SNAPSHOT_URL || `http://127.0.0.1:${process.env.QA_PORT || 5173}/`;
const out = 'browser-checks/hud-overlap'; fs.mkdirSync(out, { recursive: true });
const sizes = [
  { name: 'phone-390x844', viewport: { width: 390, height: 844 }, touch: true },
  { name: 'phone-320x568', viewport: { width: 320, height: 568 }, touch: true },
  { name: 'phone-844x390', viewport: { width: 844, height: 390 }, touch: true },
  { name: 'phone-932x430', viewport: { width: 932, height: 430 }, touch: true },
  { name: 'phone-667x375', viewport: { width: 667, height: 375 }, touch: true },
  { name: 'phone-568x320', viewport: { width: 568, height: 320 }, touch: true },
  { name: 'tablet-1024x768', viewport: { width: 1024, height: 768 }, touch: true },
  { name: 'pc-1280x720', viewport: { width: 1280, height: 720 } },
  { name: 'pc-1024x700', viewport: { width: 1024, height: 700 } },
  { name: 'pc-640x360', viewport: { width: 640, height: 360 } },
];
const only = process.env.SIZES?.split(',');
const states = [];
for (const mode of ['walk', 'build']) for (const tool of ['select', 'furniture', 'stair', 'wall', 'erase']) states.push({ mode, tool });

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = 0;
try {
  for (const size of sizes) {
    if (only && !only.includes(size.name)) continue;
    const context = await browser.newContext({ viewport: size.viewport, hasTouch: !!size.touch, isMobile: !!size.touch });
    const page = await context.newPage(); page.setDefaultTimeout(90000);
    try {
      await page.goto(`${base}?${size.touch ? 'touch=1&' : ''}relay=${encodeURIComponent('ws://127.0.0.1:' + relay.http.address().port)}`);
      await page.getByLabel('あなたの名前').fill('HUD');
      await page.getByRole('button', { name: 'みんなのワールドで遊ぶ', exact: false }).click();
      for (const end = Date.now() + 90000; Date.now() < end; await page.waitForTimeout(200))
        if (await page.evaluate(async () => !!window.__ow && (await import('/src/session/session.ts')).useSession.getState().status === 'connected')) break;
      await page.waitForTimeout(1500);
      for (const st of states) {
        await page.evaluate(({ mode, tool }) => { const g = window.__ow.game.getState(); g.setOverlay(null); g.setMode(mode); g.setTool(tool); }, st);
        await page.waitForTimeout(900);
        const bad = await page.evaluate(scan, 'body');
        const step = `${st.mode}-${st.tool}`;
        if (bad.length) { failed++; console.log('NG', size.name, step, '\n  ' + bad.join('\n  ')); await page.screenshot({ path: `${out}/${size.name}-${step}.png` }); }
        else console.log('ok', size.name, step);
      }
      await page.evaluate(() => { const g = window.__ow.game.getState(); g.setMode('walk'); g.setTool('furniture'); });
      await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${size.name}-walk-furniture.png` });
    } catch (e) { failed++; console.log('ERROR', size.name, e.message.split('\n')[0]); await page.screenshot({ path: `${out}/${size.name}-error.png` }).catch(() => {}); }
    finally { await context.close(); }
  }
} finally { await browser.close(); relay.close(); }
console.log(failed ? `${failed} screens with overlaps` : 'HUD overlap: all screens ok');
process.exitCode = failed ? 1 : 0;
