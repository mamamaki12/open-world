// お店：みんなのワールドで土地の持ち主が店を開き、別のプレイヤーがレジの画面から一回払いで買う（所持金がユーザー間で動く）
// 使い方: npm run dev を起動してから node scripts/check-player-shop.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';
const relay = createRelay(); await new Promise(r => relay.http.listen(0, '127.0.0.1', r));
const relayURL = 'ws://127.0.0.1:' + relay.http.address().port, out = 'player-shop-checks'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const errors = [];
async function open(name) {
  const page = await (await browser.newContext({ viewport: { width: 900, height: 650 } })).newPage();
  page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?touch=0&relay=' + encodeURIComponent(relayURL)); await page.getByLabel('あなたの名前').fill(name);
  await page.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.setState({ tick: () => {} }));
  return page;
}
const money = p => p.evaluate(() => window.__ow.economy.getState().money);
const openRegister = (p, lot) => p.evaluate(async lot => { (await import('/src/state/vehicles.ts')).useVehicles.setState({ target: 'register:' + lot }); window.__ow.game.getState().setOverlay('shop'); }, lot);
try {
  const owner = await open('店主'), buyer = await open('お客');
  for (const p of [owner, buyer]) await p.getByRole('button', { name: 'みんなのワールドで遊ぶ', exact: false }).click();
  for (const p of [owner, buyer]) await p.waitForFunction(() => window.__ow?.economy.getState().money === 1000000);
  // 店主：土地を買ってレジの前で店を開き、商品を登録する
  await owner.evaluate(() => window.__ow.economy.getState().receive(50000000, 'テスト'));
  await owner.waitForFunction(async () => window.__ow.economy.getState().money === 51000000 && !(await import('/src/session/session.ts')).useSession.getState().busy);
  assert.equal(await owner.evaluate(() => window.__ow.economy.getState().buyLand(window.__ow.economy.getState().offers[0].id)), null);
  await owner.waitForFunction(() => window.__ow.economy.getState().lots.length === 1);
  const lot = await owner.evaluate(() => window.__ow.economy.getState().lots[0].id);
  await openRegister(owner, lot);
  await owner.getByPlaceholder('例：しんご設計事務所').fill('しんご設計事務所');
  await owner.getByRole('button', { name: 'お店を開く' }).click();
  await owner.getByRole('button', { name: '＋ 商品を追加' }).click();
  const form = owner.locator('.shop-form');
  await form.locator('input').nth(0).fill('家の設計代行');
  await form.locator('input').nth(1).fill('300000');
  await form.locator('textarea').fill('2階建てまで。打ち合わせは現地で。');
  await owner.getByRole('button', { name: '📷 いまの景色を写す' }).click();
  await owner.getByRole('button', { name: '保存', exact: true }).click();
  await owner.waitForFunction(lot => window.__ow.economy.getState().lots.find(l => l.id === lot)?.shop?.items.length === 1, lot);
  await owner.screenshot({ path: out + '/owner.png' });
  // お客：店がサーバー経由で届き、レジから買う
  await buyer.waitForFunction(lot => !!window.__ow.economy.getState().lots.find(l => l.id === lot)?.shop?.items.length, lot);
  await buyer.evaluate(() => window.__ow.economy.getState().receive(1000000, 'テスト'));
  await buyer.waitForFunction(() => window.__ow.economy.getState().money === 2000000);
  const ownerBefore = await money(owner);
  await openRegister(buyer, lot);
  assert.ok(await buyer.locator('.shop-item img').count(), 'photo is shown to customers');
  await buyer.screenshot({ path: out + '/customer.png' });
  await buyer.getByRole('button', { name: '買う', exact: true }).click();
  await buyer.waitForFunction(() => window.__ow.economy.getState().money === 1700000);
  await owner.waitForFunction(b => window.__ow.economy.getState().money === b + 300000, ownerBefore);
  await buyer.waitForFunction(lot => window.__ow.economy.getState().lots.find(l => l.id === lot)?.shop?.sales.length === 1, lot);
  // 会員権：期限つきの券として買い手に残る
  await owner.getByRole('button', { name: '＋ 商品を追加' }).click();
  await form.locator('input').nth(0).fill('月会員');
  await form.locator('select').selectOption('membership');
  await form.locator('input').nth(2).fill('100000');
  await owner.getByRole('button', { name: '保存', exact: true }).click();
  await buyer.waitForFunction(lot => window.__ow.economy.getState().lots.find(l => l.id === lot)?.shop?.items.length === 2, lot);
  await buyer.locator('.shop-item', { hasText: '月会員' }).getByRole('button', { name: '買う' }).click();
  await buyer.locator('.shop-passes', { hasText: '月会員' }).waitFor();
  await buyer.screenshot({ path: out + '/passes.png' });
  await buyer.getByRole('button', { name: '売上', exact: true }).click();
  await buyer.screenshot({ path: out + '/sales.png' });
  // 宣伝：看板・チラシ・地図のピン・イベント告知が、ほかのプレイヤーの地図に出る
  await owner.getByRole('button', { name: '宣伝', exact: true }).click();
  const promo = owner.locator('.shop-form');
  await promo.locator('input[type=text]').nth(0).fill('設計します');
  await promo.locator('textarea').nth(0).fill('家の設計、1軒30万円から');
  await promo.locator('input[type=checkbox]').check();
  await promo.locator('input[type=text]').nth(1).fill('オープン記念相談会');
  await owner.getByRole('button', { name: '宣伝を保存' }).click();
  await buyer.waitForFunction(lot => window.__ow.economy.getState().lots.find(l => l.id === lot)?.shop?.event?.title === 'オープン記念相談会', lot);
  await buyer.evaluate(() => window.__ow.game.getState().setOverlay('map'));
  await buyer.locator('.map-shops', { hasText: 'しんご設計事務所' }).waitFor();
  assert.ok(await buyer.getByRole('button', { name: 'お店 しんご設計事務所' }).count(), 'pin on the map');
  await buyer.locator('.map-shops li').filter({ hasText: 'オープン記念相談会' }).waitFor();
  await buyer.screenshot({ path: out + '/map.png', fullPage: true });
  await buyer.locator('.map-shops').getByRole('button', { name: 'ワープ' }).click();
  await buyer.waitForTimeout(2000);
  // 土地の前の看板が店の色（オレンジ）の看板になっている
  assert.ok(await buyer.evaluate(() => { let n = 0; window.__ow.scene.traverse(o => { const img = o.material?.map?.image; if (img instanceof HTMLCanvasElement && img.width === 512 && img.height === 288) { const [r, g, b] = img.getContext('2d').getImageData(30, 30, 1, 1).data; if (r === 196 && g === 86 && b === 29) n++; } }); return n; }) >= 1, 'shop signboard');
  assert.deepEqual(errors, []);
  console.log('player shop: ok');
} finally { await browser.close(); relay.close(); }
