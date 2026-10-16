// お店：ホストが店を開き、参加した友達がレジの画面から一回払いで買う（所持金がユーザー間で動く）
// 使い方: npm run dev を起動してから node scripts/check-player-shop.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { createRelay } from '../server/relay.mjs';
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
const money = p => p.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.getState().money);
try {
  const host = await open('ホスト'), guest = await open('友達');
  await host.getByRole('button', { name: '自分のワールドを開く', exact: false }).click();
  await host.waitForFunction(async () => (await import('/src/session/session.ts')).useSession.getState().status === 'connected');
  const code = await host.evaluate(async () => (await import('/src/session/session.ts')).useSession.getState().code);
  await guest.getByLabel('招待コード').fill(code);
  await guest.getByRole('button', { name: '友達のワールドに入る', exact: true }).click();
  await guest.waitForFunction(async () => (await import('/src/session/session.ts')).useSession.getState().members.length === 2 && !!window.__ow);
  await host.waitForFunction(() => !!window.__ow);
  // ホスト：レジの前で店を開き、商品を登録する
  const lot = await host.evaluate(async () => (await import('/src/state/economy.ts')).useEconomy.getState().currentLotId);
  await host.evaluate(lot => { window.__ow.economy.getState().setShop(lot, null); }, lot);
  await host.evaluate(async lot => { (await import('/src/state/vehicles.ts')).useVehicles.setState({ target: 'register:' + lot }); window.__ow.game.getState().setOverlay('shop'); }, lot);
  await host.getByPlaceholder('例：しんご設計事務所').fill('しんご設計事務所');
  await host.getByRole('button', { name: 'お店を開く' }).click();
  await host.getByRole('button', { name: '＋ 商品を追加' }).click();
  const form = host.locator('.shop-form');
  await form.locator('input').nth(0).fill('家の設計代行');
  await form.locator('input').nth(1).fill('300000');
  await form.locator('textarea').fill('2階建てまで。打ち合わせは現地で。');
  await host.getByRole('button', { name: '📷 いまの景色を写す' }).click();
  await host.getByRole('button', { name: '保存', exact: true }).click();
  await host.screenshot({ path: out + '/owner.png' });
  // 友達：ホストの世界に店が届き、レジから買う
  await guest.waitForFunction(async lot => !!(await import('/src/state/economy.ts')).useEconomy.getState().lots.find(l => l.id === lot)?.shop?.items.length, lot);
  const [hostBefore, guestBefore] = [await money(host), await money(guest)];
  await guest.evaluate(async lot => { (await import('/src/state/vehicles.ts')).useVehicles.setState({ target: 'register:' + lot }); window.__ow.game.getState().setOverlay('shop'); }, lot);
  assert.ok(await guest.locator('.shop-item img').count(), 'photo is shown to customers');
  await guest.screenshot({ path: out + '/customer.png' });
  await guest.getByRole('button', { name: '買う', exact: true }).click();
  await guest.waitForFunction(async () => (await import('/src/session/session.ts')).useSession.getState().message.includes('を買いました'));
  await host.waitForFunction(async b => (await import('/src/state/economy.ts')).useEconomy.getState().money === b + 300000, hostBefore);
  assert.equal(await money(guest), guestBefore - 300000, 'buyer paid once');
  await guest.waitForFunction(async lot => (await import('/src/state/economy.ts')).useEconomy.getState().lots.find(l => l.id === lot)?.shop?.sales.length === 1, lot);
  await guest.getByRole('button', { name: '売上', exact: true }).click();
  await guest.screenshot({ path: out + '/sales.png' });
  assert.deepEqual(errors, []);
  console.log('player shop: ok');
} finally { await browser.close(); relay.close(); }
