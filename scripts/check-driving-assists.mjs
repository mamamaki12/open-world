import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?touch=1');
  await page.waitForFunction(() => window.__ow);
  await page.locator('.tool.mode').click();
  await page.evaluate(async () => {
    const { emptyHouse } = await import('/src/building/types.ts');
    const { useVehicles } = await import('/src/state/vehicles.ts');
    const { driveButtons } = await import('/src/world/vehicleLogic.ts');
    const { currentPlotOf } = await import('/src/state/economy.ts');
    const { plotX, plotZ } = await import('/src/economy/town.ts');
    const plot = currentPlotOf(window.__ow.economy.getState());
    window.__ow.game.getState().replaceHouse(emptyHouse());
    window.__ow.scene.getObjectByName('neighbors').visible = false;
    const start = { x: 10 + plotX(plot), z: 14 + plotZ(plot), yaw: 0, speed: 8, steer: 0, wheelSpin: 0, braking: false, slipAngle: 0 };
    useVehicles.setState({ cars: [{ id: 'drift-test', model: 'moco', color: '#334455', ...start, lights: false }], driving: 'drift-test', target: 'drift-test' });
    window.__driveTest = { useVehicles, driveButtons, start };
  });
  await page.getByRole('button', { name: 'サイドブレーキ', exact: true }).waitFor();
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    const boxes = await page.locator('.drive-steering button,.drive-pedals button,.drive-handbrake').evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
    assert.equal(boxes.length, 5);
    for (const b of boxes) assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= viewport.width && b.y + b.h <= viewport.height && b.w >= 44 && b.h >= 44, 'all five driving controls fit');
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, 'driving controls do not overlap');
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const center = async name => { const r = await page.getByRole('button', { name, exact: true }).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const hand = await center('サイドブレーキ'), left = await center('左にハンドルを切る');
  const cdp = await context.newCDPSession(page);
  await page.evaluate(() => Object.assign(window.__driveTest.useVehicles.getState().cars[0], window.__driveTest.start));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...hand, id: 1 }, { ...left, id: 2 }] });
  await page.waitForFunction(() => { const c = window.__driveTest.useVehicles.getState().cars[0]; return c.drifting && Math.abs(c.slipAngle) > .12; });
  await page.locator('.drive-drift').filter({ hasText: 'DRIFT' }).waitFor();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForFunction(() => !Object.values(window.__driveTest.driveButtons).some(Boolean));
  await page.waitForFunction(() => Math.abs(window.__driveTest.useVehicles.getState().cars[0].slipAngle) < .02);
  console.log('PASS: side brake + steering produces drift, release restores grip, five controls fit 320/390/844px');
  await page.evaluate(() => Object.assign(window.__driveTest.useVehicles.getState().cars[0], window.__driveTest.start));
  await page.keyboard.down('Shift'); await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => window.__driveTest.useVehicles.getState().cars[0].drifting);
  await page.keyboard.up('Shift'); await page.keyboard.up('ArrowLeft');
  await page.waitForFunction(() => !window.__driveTest.useVehicles.getState().cars[0].handbraking);
  console.log('PASS: Shift enables handbrake drift');
  // Hold the service brake from forward motion: first decelerate, then reverse.
  await page.evaluate(() => Object.assign(window.__driveTest.useVehicles.getState().cars[0], window.__driveTest.start, { speed: 6, reverseHold: 0, slipAngle: 0 }));
  const brake = await center('ブレーキ');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...brake, id: 1 }] });
  await page.waitForFunction(() => { const c = window.__driveTest.useVehicles.getState().cars[0]; return c.speed > 0 && c.speed < 5; });
  await page.waitForFunction(() => window.__driveTest.useVehicles.getState().cars[0].speed < -.3);
  const reverseSpeed = await page.evaluate(() => window.__driveTest.useVehicles.getState().cars[0].speed);
  assert.ok(reverseSpeed >= -3, 'reverse speed stays capped');
  await page.locator('.drive-speed').filter({ hasText: 'R' }).waitFor();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForFunction(() => !window.__driveTest.driveButtons.brake && window.__driveTest.useVehicles.getState().cars[0].reverseHold === 0);
  const releasedSpeed = await page.evaluate(() => window.__driveTest.useVehicles.getState().cars[0].speed);
  await page.waitForFunction(v => window.__driveTest.useVehicles.getState().cars[0].speed > v + .05, releasedSpeed);
  console.log('PASS: holding brake slows forward motion, reverses after stop, shows R, and cancellation stops reverse acceleration');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
