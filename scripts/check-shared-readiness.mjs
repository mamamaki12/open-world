import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';
const relay = createRelay(); await relay.ready;
await new Promise(r => relay.http.listen(0, '127.0.0.1', r));
let held = [], welcomes = 0;
relay.wss.on('connection', socket => {
  const send = socket.send.bind(socket);
  socket.send = (data, ...rest) => {
    const m = JSON.parse(String(data));
    if (m.type === 'welcome') welcomes++;
    if (m.type === 'world' || m.type === 'account') held.push({ type: m.type, send: () => send(data, ...rest) });
    else send(data, ...rest);
  };
});
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } }); page.setDefaultTimeout(90000);
  await page.goto((process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/') + '?touch=0&relay=' + encodeURIComponent('ws://127.0.0.1:' + relay.http.address().port));
  await page.getByLabel('あなたの名前').waitFor();
  const state = () => page.evaluate(async () => { const s = (await import('/src/session/session.ts')).useSession.getState(); return { screen: s.screen, status: s.status }; });
  for (let round = 1; round <= 2; round++) {
    held = []; await page.getByRole('button', { name: 'みんなのワールドで遊ぶ', exact: false }).click();
    for (let i = 0; i < 100 && welcomes < round; i++) await page.waitForTimeout(50);
    assert.equal(welcomes, round);
    await page.waitForTimeout(100);
    assert.deepEqual(await state(), { screen: 'menu', status: 'connecting' }, 'welcome alone is not ready');
    for (const m of held.filter(x => x.type === 'world')) m.send(); held = held.filter(x => x.type !== 'world');
    await page.waitForTimeout(100);
    assert.deepEqual(await state(), { screen: 'menu', status: 'connecting' }, 'world without account is not ready');
    for (const m of held.filter(x => x.type === 'account')) m.send(); held = held.filter(x => x.type !== 'account');
    // The migration may generate another account message; unblock those normally now.
    for (let i = 0; i < 100; i++) {
      for (const m of held.splice(0)) m.send();
      if ((await state()).status === 'connected') break;
      await page.waitForTimeout(50);
    }
    assert.deepEqual(await state(), { screen: 'game', status: 'connected' });
    await page.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().setOverlay('map'));
    await page.getByRole('dialog', { name: '🗺 町の地図' }).waitFor();
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(async () => (await import('/src/state/store.ts')).useGame.getState().overlay), 'map');
    await page.keyboard.press('Escape');
    // Flush any wallet acknowledgement before leaving.
    for (let i = 0; i < 100; i++) {
      for (const m of held.splice(0)) m.send();
      await page.evaluate(async () => (await import('/src/session/session.ts')).leaveWorld());
      if ((await state()).screen === 'menu') break;
      await page.waitForTimeout(50);
    }
    assert.equal((await state()).screen, 'menu');
  }
  console.log('First and returning shared joins wait for world+account; map stays open after readiness');
} finally { await browser.close(); relay.close(); }
