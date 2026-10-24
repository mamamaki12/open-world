// ページ拡大（PCのCtrl+、iOSのaA、Androidの表示サイズ）で文字が大きくなった時に
// ボタンや文字が重なったり画面外へはみ出したりしないかを検査する。
// 拡大はCSS上の画面幅が狭くなるのと同じなので、縮小viewport + deviceScaleFactorで再現する。
import fs from 'node:fs';
import { chromium } from 'playwright';

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

// 表示中の文字・操作要素を集め、重なり・画面外・文字切れを返す
function scan(rootSel) {
  const roots = [...document.querySelectorAll(rootSel)].filter(r => r.getClientRects().length);
  const bad = [];
  const label = e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 30) + ' <' + e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + '>';
  const visible = e => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  // 祖先のスクロール領域・overflow:hiddenで実際に見えている範囲
  const clipRect = e => { let r = e.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom;
    for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { const q = p.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } }
    return { left: L, top: T, right: R, bottom: B }; };
  const els = [];
  for (const root of roots) for (const e of root.querySelectorAll('button,input,select,textarea,a,summary,label,h1,h2,h3,h4,p,span,strong,b,small,em,div,li,td,th')) {
    if (!visible(e) || e.closest('[aria-hidden="true"]')) continue;
    if (e.closest('details:not([open])') && !e.closest('summary')) continue; // 閉じた折りたたみの中身
    const ctrl = /^(BUTTON|INPUT|SELECT|TEXTAREA|A|SUMMARY)$/.test(e.tagName);
    const ownText = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!ctrl && !ownText) continue;
    if (!ctrl && e.closest('button,a,summary,label,select')) continue;
    const c = clipRect(e); if (c.right - c.left < 2 || c.bottom - c.top < 2) continue;
    // 他の表示（開いたメニュー等）に完全に隠れている要素は見えないので対象外
    const top = document.elementFromPoint((Math.max(c.left, 0) + Math.min(c.right, innerWidth)) / 2, (Math.max(c.top, 0) + Math.min(c.bottom, innerHeight)) / 2);
    if (top && !(e.contains(top) || top.contains(e) || top.tagName === 'CANVAS')) { const z = top.closest('.overlay,.save-menu,.walk-menu-list,.sheet'); if (z && !z.contains(e)) continue; }
    els.push({ e, c });
    if (c.left < -1 || c.right > innerWidth + 1 || c.top < -1 || c.bottom > innerHeight + 1) bad.push('offscreen: ' + label(e));
    const s = getComputedStyle(e);
    if (ownText && s.textOverflow !== 'ellipsis' && (s.overflowX === 'hidden' || s.overflowX === 'clip') && e.scrollWidth > e.clientWidth + 2) bad.push('clipped: ' + label(e));
  }
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    // スクロールする中身の上に固定した購入バー等（position: sticky）は意図した重なり
    const sticky = e => { for (let p = e; p; p = p.parentElement) if (getComputedStyle(p).position === 'sticky') return p; return null; };
    if (sticky(a.e) !== sticky(b.e)) continue;
    // 開いたメニュー（ドロップダウン）が他の表示に被さるのは意図した重なり
    const pop = e => e.closest('.overlay,.save-menu,.walk-menu-list');
    if (pop(a.e) !== pop(b.e)) continue;
    const w = Math.min(a.c.right, b.c.right) - Math.max(a.c.left, b.c.left), h = Math.min(a.c.bottom, b.c.bottom) - Math.max(a.c.top, b.c.top);
    if (w <= 3 || h <= 3) continue;
    // 上に重なっている方が完全に覆っている（モーダル等）なら、下は見えないので重なりとしない
    const x = (Math.max(a.c.left, b.c.left) + Math.min(a.c.right, b.c.right)) / 2, y = (Math.max(a.c.top, b.c.top) + Math.min(a.c.bottom, b.c.bottom)) / 2;
    const top = document.elementFromPoint(x, y); if (!top) continue;
    const hitA = a.e.contains(top) || top.contains(a.e), hitB = b.e.contains(top) || top.contains(b.e);
    if (!hitA && !hitB) continue;
    bad.push('overlap: ' + label(a.e) + ' × ' + label(b.e));
  }
  return [...new Set(bad)];
}

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
