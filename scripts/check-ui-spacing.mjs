// スマホ縦・横・小さいスマホで、開ける画面を全部たどり、ボタンどうしが近すぎて押し分けにくいところがないか調べる
// （しんご 2026-11-10「ボタンとボタンの距離が異様に近いとこなども修正してね」）。判定は spacing-scan.mjs。
// 道順は check-ui-overlap-all.mjs と同じ（開始画面・歩く・建築・メニュー・全パネルとタブ・カジノの各ゲーム・バイトの各仕事・運転中・写真モード）。
// SIZES=phone-390x844 OVERLAYS=casino SHOTS=1 で絞り込み・画面写真。PC はレイアウトが壊れていないかを重なり検査で見るので対象外。
import fs from 'node:fs';
import { chromium } from 'playwright';
import { spacingScan } from './spacing-scan.mjs';

const base = process.env.UI_SNAPSHOT_URL || `http://127.0.0.1:${process.env.QA_PORT || 5173}/`;
const out = process.env.OUT || 'browser-checks/ui-spacing'; fs.mkdirSync(out, { recursive: true });
const sizes = [
  { name: 'phone-390x844', viewport: { width: 390, height: 844 } },
  { name: 'phone-844x390', viewport: { width: 844, height: 390 } },
  { name: 'phone-320x568', viewport: { width: 320, height: 568 } },
];
// 'photo' は写真モード（usePhoto）で、パネルとしては開かないので最後に別に見る。'designer' は openDesigner() で開く
const overlays = ['estate', 'casino', 'map', 'dealer', 'tuner', 'exchange', 'land', 'controls', 'inventory', 'boutique', 'closet', 'jobs', 'shop', 'requests', 'arcade', 'ride', 'looks', 'looks-edit', 'salon', 'designer', 'quests', 'blueprints', 'ranking'];
const only = process.env.SIZES?.split(',');
const onlyOv = process.env.OVERLAYS?.split(',');

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = 0;
const report = {}; const screens = []; const skipped = []; const lows = new Set();
for (const size of sizes) {
  if (only && !only.includes(size.name)) continue;
  const context = await browser.newContext({ viewport: size.viewport, hasTouch: true, isMobile: true });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  const check = async (step, root = 'body') => {
    await page.waitForTimeout(450);
    const all = await page.evaluate(spacingScan, root);
    const bad = all.filter(x => x.sev !== 'low');
    screens.push(size.name + ' ' + step);
    report[size.name + ' ' + step] = all;
    for (const x of all.filter(x => x.sev === 'low')) lows.add(`${size.name}  ${x.gap}px  ${x.a}  ×  ${x.b}`);
    const shot = () => page.screenshot({ path: `${out}/${size.name}-${step}.png` });
    if (bad.length) { failed++; console.log('NG', size.name, step, '\n  ' + bad.map(x => `[${x.sev}] ${x.gap}px  ${x.a}  ×  ${x.b}`).join('\n  ')); await shot(); }
    else { console.log('ok', size.name, step); if (process.env.SHOTS) await shot(); }
  };
  const game = (fn, arg) => page.evaluate(fn, arg);
  const reopen = async (o) => { await game(() => window.__ow.game.getState().setOverlay(null)); await page.waitForTimeout(200); await game((o) => window.__ow.game.getState().setOverlay(o), o); await page.waitForTimeout(500); };
  try {
    // 開始画面
    await page.goto(`${base}?touch=1`);
    await page.getByRole('button', { name: /ひとりで遊ぶ/ }).first().waitFor();
    await page.waitForTimeout(800);
    await check('title');
    await page.goto(`${base}?play=1&touch=1`);
    await page.waitForFunction(() => window.__ow);
    await game(() => { window.__ow.economy.setState({ money: 30000000 }); const g = window.__ow.game.getState(); g.setOverlay(null); g.setMode('walk'); });
    await page.waitForTimeout(1500);
    await check('walk');
    const menu = page.getByRole('button', { name: 'メニュー', exact: true }).first();
    await menu.click(); await check('walk-menu', '.walk-menu-list');
    // メニューの中のセーブ／ロード
    const save = page.locator('.walk-menu-list .save > button').first();
    if (await save.count()) { await save.click(); await check('walk-menu-save'); await save.dispatchEvent('click'); } else skipped.push(size.name + ' walk-menu-save: ボタンなし');
    await menu.dispatchEvent('click');
    // ドアの前（操作ボタン）
    await page.evaluate(async () => { const { useDoors } = await import('/src/state/doors.ts'); useDoors.setState({ target: 'test-door' }); window.__doorKeep = useDoors.subscribe(s => { if (!s.target) useDoors.setState({ target: 'test-door' }); }); });
    await page.waitForTimeout(400);
    if (await page.locator('.door-prompt').count()) await check('walk-door'); else skipped.push(size.name + ' walk-door: ドアのボタンが出ない');
    await page.evaluate(async () => { window.__doorKeep?.(); const { useDoors } = await import('/src/state/doors.ts'); useDoors.setState({ target: null }); });
    // 歩く画面から建築メニュー
    const wb = page.locator('.build-fab').first();
    if (await wb.count()) { await wb.click(); await check('walk-build-menu'); await page.keyboard.press('Escape'); await game(() => window.__ow.game.getState().setTool('select')); }
    // 建築画面・メニュー・建築メニュー・道具を持ったところ
    await game(() => window.__ow.game.getState().setMode('build')); await page.waitForTimeout(800);
    await check('build');
    await menu.click(); await check('build-menu-list', '.walk-menu-list'); await menu.dispatchEvent('click');
    const fab = page.locator('.build-fab').first();
    if (await fab.count()) {
      await fab.click(); await check('build-menu');
      // 道具を選んだあとの種類・素材・色・家具の一覧（素材の一覧も開く）
      for (const t of ['floor', 'wall', 'window', 'door', 'stair', 'roof', 'furniture']) {
        await page.locator(`.build-menu [data-tool="${t}"]`).click();
        const more = page.locator('.build-menu .mat-toggle').first();
        if (await more.count()) await more.click();
        await check('build-menu-' + t, '.build-menu');
      }
      await page.keyboard.press('Escape');
    }
    for (const tool of ['wall', 'floor', 'furniture', 'erase']) {
      const ok = await game((t) => { try { window.__ow.game.getState().setTool(t); return true; } catch { return false; } }, tool);
      if (!ok) { skipped.push(size.name + ' build-' + tool + ': 道具なし'); continue; }
      await page.waitForTimeout(400); await check('build-' + tool);
    }
    await game(() => { const g = window.__ow.game.getState(); g.setTool('select'); g.setMode('walk'); }); await page.waitForTimeout(600);
    for (const o of overlays) {
      if (onlyOv && !onlyOv.includes(o)) continue;
      try {
        await game((o) => { const g = window.__ow.game.getState(); g.setOverlay(null); g.setOverlay(o); }, o);
        if (o === 'designer') await page.evaluate(async () => (await import('/src/ui/designer.ts')).openDesigner());
        await page.waitForTimeout(700);
        if (!await page.locator('.overlay').count()) { skipped.push(`${size.name} ${o}: パネルが開かない`); continue; }
        await check(o, '.overlay');
        const tabs = page.locator('.overlay .modal-tabs > button');
        const n = await tabs.count();
        for (let i = 1; i < n; i++) {
          const name = (await tabs.nth(i).textContent()).trim().replace(/\s+/g, '');
          await tabs.nth(i).click();
          await check(`${o}-${i}-${name}`, '.overlay');
        }
        // カジノのゲーム・バイトの仕事は、カードを1つずつ開いて中の画面も見る（バイトは始めたところも）
        const cardSel = '.overlay .casino-game-card, .overlay .job-card';
        const m = await page.locator(cardSel).count();
        for (let i = 0; i < m; i++) {
          await reopen(o);
          const card = page.locator(cardSel).nth(i);
          const name = (await card.textContent()).trim().replace(/\s+/g, '').slice(0, 8);
          await card.click();
          await check(`${o}-card${i}-${name}`, '.overlay');
          if (o === 'jobs') {
            // シフトの終わり（給料を受け取る → もう1シフト・ほかのバイト）も見る。時計を進めて終わらせる
            await page.evaluate(() => { if (!window.__nowOff) { const now = performance.now.bind(performance); window.__nowOff = 0; performance.now = () => now() + window.__nowOff; } window.__nowOff += 3600e3; });
            await page.waitForTimeout(800);
            await check(`${o}-card${i}-${name}-end`, '.overlay');
            const take = page.locator('.overlay button', { hasText: '給料を受け取る' });
            if (await take.count()) { await take.click(); await check(`${o}-card${i}-${name}-paid`, '.overlay'); }
          }
          if (o === 'casino') {
            const guide = page.locator('.overlay button', { hasText: /遊び方/ }).first();
            if (await guide.count()) { await guide.click(); await check(`${o}-card${i}-${name}-guide`, '.overlay'); }
          }
        }
        // 家具デザインは部品を1つ選んだところ（複製・削除のボタン）も見る
        if (o === 'designer') {
          const part = page.locator('.overlay .designer-parts button').first();
          if (await part.count()) { await part.click(); await check('designer-part', '.overlay'); } else skipped.push(size.name + ' designer-part: 部品なし');
        }
        // 車屋は1台選んだ詳細（色・購入確認）も見る
        if (o === 'dealer') {
          await reopen(o);
          const c = page.locator('.overlay .cat-card').first();
          if (await c.count()) {
            await c.click(); await check('dealer-detail', '.overlay');
            const buy = page.locator('.overlay .catalog-buy-button');
            if (await buy.isEnabled()) { await buy.click(); await check('dealer-confirm', '.overlay'); }
          } else skipped.push(size.name + ' dealer-detail: 車のカードなし');
        }
      } catch (e) { failed++; console.log('ERROR', size.name, o, e.message.split('\n')[0]); skipped.push(`${size.name} ${o}: ${e.message.split('\n')[0]}`); }
    }
    await game(() => window.__ow.game.getState().setOverlay(null));
    // 写真モード
    await page.evaluate(async () => { (await import('/src/state/photo.ts')).usePhoto.setState({ on: true }); });
    await page.waitForTimeout(600); await check('photo');
    await page.evaluate(async () => { (await import('/src/state/photo.ts')).usePhoto.setState({ on: false }); });
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
fs.writeFileSync(out + '/report.json', JSON.stringify({ screens, skipped, report }, null, 2));
if (lows.size) console.log(`近め（4〜8px・失敗にしない）:\n  ` + [...lows].join('\n  '));
if (skipped.length) console.log('skipped:\n  ' + skipped.join('\n  '));
console.log(failed ? `${failed} screens with buttons too close` : `UI spacing: all ${screens.length} screens ok`);
process.exitCode = failed ? 1 : 0;
