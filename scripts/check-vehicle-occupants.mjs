import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const out = 'browser-checks/vehicle-occupants'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try { for (const touch of [false, true]) {
  const name = touch ? 'phone' : 'pc', context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: touch, isMobile: touch });
  const page = await context.newPage(); page.setDefaultTimeout(90000); const errors = []; page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(`${process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/'}?play=1&touch=${Number(touch)}`);
    await page.waitForFunction(() => window.__ow?.scene?.getObjectByName('town-houses')?.userData.baking === false);
    await page.evaluate(async touch => {
      const { useSession } = await import('/src/session/session.ts'), { useVehicles } = await import('/src/state/vehicles.ts');
      const { useWardrobe } = await import('/src/state/wardrobe.ts'), { useLooks } = await import('/src/state/looks.ts');
      const { STOCK_MODS } = await import('/src/catalog/carMods.ts'), { emptyHouse } = await import('/src/building/types.ts');
      const { currentPlotOf } = await import('/src/state/economy.ts'), { plotX, plotZ } = await import('/src/economy/town.ts');
      const plot = currentPlotOf(window.__ow.economy.getState()), ox = plotX(plot), oz = plotZ(plot);
      const g = window.__ow.game.getState(); g.setMode('build'); g.setOverlay(null); g.replaceHouse(emptyHouse());
      useVehicles.setState({ cars: [], driving: null, riding: null });
      const car = { id: 'qa-car', model: 'breeze', color: '#b52734', x: ox + 10, z: oz + 13, yaw: 0, speed: 0, steer: 0, wheelSpin: 0, braking: false, lights: true, mods: STOCK_MODS };
      const p = { x: car.x, y: 0, z: car.z, yaw: 0, outfit: useWardrobe.getState().outfit, looks: useLooks.getState().looks, walking: false };
      useSession.setState({ members: [{ id: 'qa-driver', name: '運転手A', host: true, canBuild: true }, { id: 'qa-rider', name: '同乗者B', host: false, canBuild: false }],
        poses: { 'qa-driver': { ...p, cars: [car], driving: car.id }, 'qa-rider': { ...p, cars: [], riding: car.id, ridingOwner: 'qa-driver', ridingSeat: 1 } } });
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js'); const s = _roots.get(document.querySelector('canvas')).store.getState();
      s.controls.target.set(10, 1, 13); s.camera.position.set(touch ? 10 : 13, touch ? 4 : 2.5, touch ? 0 : 9); s.camera.lookAt(s.controls.target); s.controls.update();
      window.__seatTest = { useSession, useVehicles, car, ox, oz, state: s };
    }, touch);
    await page.waitForFunction(() => window.__ow.scene.getObjectByName('vehicle-occupant-qa-driver') && window.__ow.scene.getObjectByName('vehicle-occupant-qa-rider'));
    const occupants = await page.evaluate(() => ['qa-driver', 'qa-rider'].map(id => window.__ow.scene.getObjectByName('vehicle-occupant-' + id).userData));
    assert.deepEqual(occupants.map(p => p.seat), [0, 1]);
    await page.screenshot({ path: `${out}/${name}-two-seats.png` });
    const before = await page.evaluate(() => { const ids = []; window.__ow.scene.getObjectByName('remote-vehicle-qa-driver-qa-car').traverse(o => { if (o.isMesh) ids.push(o.geometry.uuid); }); return ids; });
    assert(before.length > 100, 'the real vehicle and occupants must be mounted');
    await page.evaluate(() => { const t = window.__seatTest, s = t.useSession.getState(), driver = s.poses['qa-driver']; t.useSession.setState({ poses: { ...s.poses, 'qa-driver': { ...driver, cars: driver.cars.map(c => ({ ...c, x: c.x + .2, mods: { ...c.mods } })) } } }); });
    await page.waitForFunction(() => window.__ow.scene.getObjectByName('remote-vehicle-qa-driver-qa-car').position.x > window.__seatTest.car.x + .1);
    const after = await page.evaluate(() => { const ids = []; window.__ow.scene.getObjectByName('remote-vehicle-qa-driver-qa-car').traverse(o => { if (o.isMesh) ids.push(o.geometry.uuid); }); return ids; });
    assert.deepEqual(after, before, 'a position update must not rebuild car or avatar geometry');
    // Put the local player beside the remote car; use the real interaction control to enter.
    await page.evaluate(async () => {
      const t = window.__seatTest, s = t.useSession.getState(); t.useSession.setState({ poses: { 'qa-driver': s.poses['qa-driver'] } });
      window.__ow.game.getState().setMode('walk');
      Object.assign(window.__ow.player, { x: 11.6, y: 0, z: 13, yaw: 0, bodyYaw: 0, pitch: -.2 });
    });
    await page.getByRole('button', { name: /空いている席に乗る/ }).waitFor();
    if (touch) await page.getByRole('button', { name: /空いている席に乗る/ }).click(); else await page.keyboard.press('f');
    await page.waitForFunction(() => window.__seatTest.useVehicles.getState().riding?.seat === 1);
    await page.getByText('乗車中（2名）', { exact: true }).click();
    assert((await page.locator('.vehicle-roster').innerText()).includes('運転席：運転手A'));
    await page.screenshot({ path: `${out}/${name}-riding.png` });
    await page.getByRole('button', { name: '座席から見る', exact: true }).click();
    await page.waitForFunction(() => window.__ow.game.getState().view === 'first');
    const first = await page.evaluate(async () => { const { sessionGate } = await import('/src/session/gate.ts'); return { own: window.__ow.scene.getObjectByName('vehicle-occupant-' + sessionGate.selfId()).children[0].visible, driver: window.__ow.scene.getObjectByName('vehicle-occupant-qa-driver').children[0].visible }; });
    assert.deepEqual(first, { own: false, driver: true });
    await page.screenshot({ path: `${out}/${name}-first-person.png` });
    await page.getByRole('button', { name: /降りる/ }).click();
    await page.waitForFunction(() => !window.__seatTest.useVehicles.getState().riding);
    // Also enter and drive the local user's car through the actual controls.
    await page.evaluate(() => {
      const t = window.__seatTest; t.useSession.setState({ poses: {} });
      t.useVehicles.setState({ cars: [{ ...t.car, id: 'qa-own', x: t.ox + 10, z: t.oz + 13 }], driving: null, riding: null });
      window.__ow.game.setState({ view: 'third' }); Object.assign(window.__ow.player, { x: 8.5, y: 0, z: 13.2, yaw: 0, bodyYaw: 0 });
    });
    await page.getByRole('button', { name: /運転席に乗る/ }).waitFor();
    if (touch) await page.getByRole('button', { name: /運転席に乗る/ }).click(); else await page.keyboard.press('f');
    await page.waitForFunction(() => window.__seatTest.useVehicles.getState().driving === 'qa-own');
    const ownSeat = await page.evaluate(async () => { const { sessionGate } = await import('/src/session/gate.ts'); return window.__ow.scene.getObjectByName('vehicle-occupant-' + sessionGate.selfId())?.userData.seat; });
    assert.equal(ownSeat, 0);
    const hold = async label => { const r = await page.getByRole('button', { name: label, exact: true }).boundingBox(); await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down(); };
    if (touch) await hold('アクセル'); else await page.keyboard.down('w');
    await page.waitForFunction(() => window.__seatTest.useVehicles.getState().cars[0].speed > .3);
    if (touch) await page.mouse.up(); else await page.keyboard.up('w');
    await page.screenshot({ path: `${out}/${name}-driving.png` });
    if (touch) await hold('ブレーキ'); else await page.keyboard.down('Space');
    await page.waitForFunction(() => Math.abs(window.__seatTest.useVehicles.getState().cars[0].speed) < .3);
    if (touch) await page.mouse.up(); else await page.keyboard.up('Space');
    await page.getByRole('button', { name: /降りる/ }).click();
    await page.waitForFunction(() => !window.__seatTest.useVehicles.getState().driving);
    assert.deepEqual(errors, []); results.push({ name, seats: occupants, recreatedGeometry: 0, enterExit: true, driveOwn: true, firstPerson: true, errors }); console.log(name + ': occupants, stable geometry, entry/exit and first person passed');
  } catch (error) { await page.screenshot({ path: `${out}/${name}-failure.png` }); throw error; } finally { await context.close(); }
} } finally { await browser.close(); await writeFile(out + '/results.json', JSON.stringify(results, null, 2)); }
