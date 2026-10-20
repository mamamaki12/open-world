import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';

await mkdir('world-session-checks', { recursive: true });
const relay = createRelay(); await relay.ready;
await new Promise(r => relay.http.listen(0, '127.0.0.1', r));
const base = process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/';
const url = base + '?touch=0&relay=' + encodeURIComponent('ws://127.0.0.1:' + relay.http.address().port);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const contexts = [], errors = [];
async function until(p, fn) {
  for (const end = Date.now() + 90000; Date.now() < end; await p.waitForTimeout(100)) if (await p.evaluate(fn)) return;
  throw Error('Recovery condition timed out: ' + fn);
}
async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } }); contexts.push(ctx);
  const p = await ctx.newPage(); p.setDefaultTimeout(90000); p.on('pageerror', e => errors.push(e.message));
  await p.goto(url); await p.getByLabel('あなたの名前').waitFor(); return p;
}
async function personal(p) {
  return p.evaluate(async () => ({ looks: (await import('/src/state/looks.ts')).useLooks.getState().looks,
    stocks: (await import('/src/state/stocks.ts')).useStocks.getState().holdings,
    designs: (await import('/src/catalog/designs.ts')).useDesigns.getState().designs.map(d => d.id) }));
}
try {
  const page = await fresh();
  const stockResult = await page.evaluate(async () => {
    const { useEconomy } = await import('/src/state/economy.ts'), { useStocks, buyStock, sellStock } = await import('/src/state/stocks.ts');
    useEconomy.setState({ money: 1000, tick: () => {} });
    useStocks.setState({ quotes: { updated: 1, quotes: { test: { price: 6500, prevClose: 6500, currency: 'JPY', time: 1, intraday: [], daily: [] } } }, holdings: {} });
    const buyError = buyStock('test', 'test', 100), tinyError = sellStock('test', 'test', 0.0001);
    for (let i = 0; i < 76; i++) { const error = sellStock('test', 'test', 0.0002); if (error) throw Error(error); }
    return { buyError, tinyError, money: useEconomy.getState().money, held: useStocks.getState().holdings.test.units };
  });
  assert.equal(stockResult.buyError, null); assert.ok(stockResult.tinyError);
  assert.equal(stockResult.money, 976); assert.equal(stockResult.held, 0.0001);
  const backup = await page.evaluate(async () => {
    const { useLooks } = await import('/src/state/looks.ts'); useLooks.getState().set({ ...useLooks.getState().looks, sex: 'f', hair: 'pony', hairColor: 4 });
    const { useDesigns, TEMPLATES } = await import('/src/catalog/designs.ts'); useDesigns.getState().save({ ...TEMPLATES[1].def, id: 'design:recovery-test' });
    return (await import('/src/session/saves.ts')).snapshot();
  });
  const dest = await fresh();
  // Exercise the real backup file input, not just the import helper.
  await dest.getByText('接続・バックアップ', { exact: true }).click();
  await dest.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await until(dest, async () => (await import('/src/state/looks.ts')).useLooks.getState().looks.sex === 'f');
  const expected = await personal(page);
  assert.deepEqual(await personal(dest), expected);
  await dest.reload(); await dest.getByLabel('あなたの名前').waitFor();
  assert.deepEqual(await personal(dest), expected, 'backup survives a new page load');
  const legacy = { ...backup }; delete legacy.appearance; delete legacy.holdings; delete legacy.designs;
  await dest.evaluate(async legacy => (await import('/src/session/saves.ts')).importSave(JSON.stringify(legacy)), legacy);
  assert.deepEqual(await personal(dest), expected, 'legacy backup does not wipe newer personal fields');
  await dest.getByRole('button', { name: 'みんなのワールドで遊ぶ', exact: false }).click();
  await until(dest, async () => {
    const { useSession } = await import('/src/session/session.ts'), { savedBundle } = await import('/src/session/saves.ts');
    return useSession.getState().status === 'connected' && savedBundle().wallet && !savedBundle().wallet.pending.length;
  });
  const during = await dest.evaluate(async () => {
    const { useStocks } = await import('/src/state/stocks.ts'); useStocks.setState({ holdings: { shared: { units: 3, cost: 999 } } });
    return (await import('/src/session/saves.ts')).snapshot();
  });
  assert.deepEqual(during.holdings, backup.holdings, 'shared assets must not replace the private backup');
  await dest.waitForTimeout(300);
  for (let i = 0; i < 60; i++) {
    await dest.evaluate(async () => (await import('/src/session/session.ts')).leaveWorld());
    if (await dest.evaluate(async () => (await import('/src/session/session.ts')).useSession.getState().screen === 'menu')) break;
    await dest.waitForTimeout(100);
  }
  assert.deepEqual(await personal(dest), expected, 'shared visit preserves private profile and shares');
  await page.getByRole('button', { name: 'ひとりで遊ぶ', exact: false }).click();
  await page.evaluate(async () => {
    const { useGame } = await import('/src/state/store.ts'), { useDesigns } = await import('/src/catalog/designs.ts');
    const design = useDesigns.getState().designs.find(d => d.id === 'design:recovery-test');
    const g = useGame.getState();
    useGame.setState({ mode: 'build', tool: 'select', house: { ...g.house, furniture: [...g.house.furniture,
      { id: 'protected-furniture', type: design.id, design, x: 3, z: 3, level: 0, rotation: 0, color: '#abcdef' }] }, selection: { kind: 'furniture', id: 'protected-furniture' } });
  });
  await page.getByRole('button', { name: 'このデザインを編集', exact: true }).click();
  await page.getByRole('dialog', { name: '家具のデザイン' }).waitFor();
  const before = await page.evaluate(async () => { const s = (await import('/src/state/store.ts')).useGame.getState(); return { mode: s.mode, tool: s.tool, house: s.house }; });
  for (const key of ['Delete', 'Control+z', 'Tab', 'Digit3']) await page.keyboard.press(key);
  const after = await page.evaluate(async () => { const s = (await import('/src/state/store.ts')).useGame.getState(); return { mode: s.mode, tool: s.tool, house: s.house }; });
  assert.deepEqual(after, before, 'designer keyboard input must not change the house or game mode');
  await page.screenshot({ path: 'world-session-checks/designer-input-isolation.png' });
  await page.getByRole('button', { name: '保存して置く', exact: true }).click();
  await page.getByRole('dialog', { name: '家具のデザイン' }).waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().overlay), null);
  assert.equal(await page.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().tool), 'furniture');
  await page.reload(); await page.getByLabel('あなたの名前').waitFor();
  assert.deepEqual(await personal(page), expected, 'personal changes survive a page reload');
  assert.deepEqual(errors, []);
  console.log('Split-sale rounding, backup file import/reload/legacy/shared isolation, designer Delete/Undo/Tab/digits/save passed');
} finally { for (const ctx of contexts) await ctx.close(); await browser.close(); relay.close(); }
