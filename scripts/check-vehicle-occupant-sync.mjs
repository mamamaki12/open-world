import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';
const relay = createRelay(); await relay.ready; await new Promise(r => relay.http.listen(0, '127.0.0.1', r));
const endpoint = 'ws://127.0.0.1:' + relay.http.address().port, out = 'browser-checks/vehicle-occupants'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pages = [], errors = [];
try {
  async function open(name, touch) {
    const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage(); pages.push(page); page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/'}?play=1&touch=${Number(touch)}`); await page.waitForFunction(() => window.__ow?.game);
    await page.evaluate(async name => { const { savedBundle } = await import('/src/session/saves.ts'); savedBundle().profile.name = name;
      const { emptyHouse } = await import('/src/building/types.ts'); window.__ow.game.getState().replaceHouse(emptyHouse()); }, name);
    return page;
  }
  const host = await open('運転手A', false), guest = await open('同乗者B', true);
  await host.evaluate(async url => (await import('/src/session/session.ts')).connectWorld(url), endpoint);
  await host.waitForFunction(async () => (await import('/src/session/session.ts')).useSession.getState().status === 'connected');
  const code = await host.evaluate(async () => (await import('/src/session/session.ts')).useSession.getState().code);
  await guest.evaluate(async ({ url, code }) => (await import('/src/session/session.ts')).connectWorld(url, code), { url: endpoint, code });
  for (const page of pages) await page.waitForFunction(async () => (await import('/src/session/session.ts')).useSession.getState().members.length === 2);
  const ids = await Promise.all(pages.map(page => page.evaluate(async () => (await import('/src/session/gate.ts')).sessionGate.selfId())));
  await host.evaluate(async () => {
    const { useVehicles } = await import('/src/state/vehicles.ts'), { STOCK_MODS } = await import('/src/catalog/carMods.ts');
    const { currentPlotOf } = await import('/src/state/economy.ts'), { plotX, plotZ } = await import('/src/economy/town.ts');
    const p = currentPlotOf(window.__ow.economy.getState()); window.__ow.game.getState().setMode('walk');
    useVehicles.setState({ cars: [{ id: 'qa-network-car', model: 'breeze', color: '#b52734', x: plotX(p) + 10, z: plotZ(p) + 13,
      yaw: 0, speed: 0, steer: 0, wheelSpin: 0, braking: false, lights: true, mods: STOCK_MODS }], driving: 'qa-network-car', target: 'qa-network-car' });
  });
  await guest.evaluate(() => { window.__ow.game.getState().setMode('walk'); Object.assign(window.__ow.player, { x: 11.6, y: 0, z: 13, yaw: 0, bodyYaw: 0, pitch: -.2 }); });
  await guest.getByRole('button', { name: /空いている席に乗る/ }).click();
  for (const page of pages) await page.waitForFunction(ids => ids.every((id, seat) => window.__ow.scene.getObjectByName('vehicle-occupant-' + id)?.userData.seat === seat), ids);
  await guest.getByText('乗車中（2名）', { exact: true }).click();
  const roster = await guest.locator('.vehicle-roster').innerText(); assert(roster.includes('運転席：運転手A') && roster.includes('助手席：同乗者B'), roster);
  await host.keyboard.down('w');
  await guest.waitForFunction(async id => (await import('/src/session/session.ts')).useSession.getState().poses[id]?.cars[0]?.speed > .3, ids[0]);
  await host.keyboard.up('w');
  for (const [i, page] of pages.entries()) await page.screenshot({ path: `${out}/network-${i === 0 ? 'driver' : 'passenger'}.png` });
  await host.keyboard.down('Space'); await host.waitForFunction(async () => Math.abs((await import('/src/state/vehicles.ts')).useVehicles.getState().cars[0].speed) < .3); await host.keyboard.up('Space');
  await guest.waitForFunction(async () => { const v = await import('/src/world/vehicleLogic.ts'); return Math.abs(v.ridingCar()?.speed ?? 1) < .3; });
  await guest.getByRole('button', { name: /降りる/ }).click();
  await host.waitForFunction(id => !window.__ow.scene.getObjectByName('vehicle-occupant-' + id), ids[1]);
  assert.deepEqual(errors, []); await writeFile(out + '/network-results.json', JSON.stringify({ synchronizedSeats: [0, 1], driverAndPassengerNames: true, moving: true, exit: true, errors }, null, 2));
  console.log('PC driver / phone passenger: real relay, seated users, names, movement and exit passed');
} catch (error) { for (const [i, page] of pages.entries()) await page.screenshot({ path: `${out}/network-failure-${i}.png` }); throw error; }
finally { await browser.close(); relay.close(); }
