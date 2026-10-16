import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?play=1&touch=1');
  await page.waitForFunction(() => window.__ow);
  await page.locator('.tool.mode').click();
  await page.evaluate(async () => {
    const { emptyHouse } = await import('/src/building/types.ts');
    window.__ow.game.getState().replaceHouse(emptyHouse());
    window.__ow.game.getState().setTool('select');
    window.__ow.scene.getObjectByName('neighbors').visible = false;
    Object.assign(window.__ow.player, { x: 8, y: 0, z: 12, yaw: 0, bodyYaw: 0, pitch: 0 });
  });
  const cdp = await context.newCDPSession(page);
  const stickBox = await page.locator('.joystick').boundingBox();
  const center = { x: stickBox.x + stickBox.width / 2, y: stickBox.y + stickBox.height / 2, id: 1 };
  let held = [];
  let clock = Date.now() / 1000;
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points, timestamp: clock += .045 });
  const tap = async (x = 270, y = 340) => {
    await touch('touchStart', [...held, { x, y, id: 2 }]);
    await touch('touchEnd', [{ x, y, id: 2 }]);
  };
  const pair = async () => { await tap(); await tap(); };
  const jumps = () => page.evaluate(() => window.__ow.motion.jumps);
  const pos = () => page.evaluate(() => ({ ...window.__ow.player }));
  await page.waitForTimeout(800);
  let n = await jumps();
  await pair();
  assert.equal(await jumps(), n, 'stationary canvas double tap does not jump');
  for (const [name, deflection] of [['walk', 22], ['run', 44]]) {
    await touch('touchStart', [center]);
    held = [{ ...center, y: center.y - deflection }];
    await touch('touchMove', held);
    await page.waitForFunction(async name => {
      const { touchMove } = await import('/src/state/touch.ts');
      return touchMove.y > 0 && window.__ow.motion.running === (name === 'run');
    }, name);
    await page.waitForTimeout(400);
    n = await jumps();
    const before = await pos();
    await pair();
    assert.equal(await jumps(), n + 1, name + ': canvas double tap jumps while joystick remains held');
    await page.waitForFunction(y => window.__ow.player.y > y + .1, before.y);
    await page.waitForFunction(z => window.__ow.player.z < z - .15, before.z);
    assert.ok(await page.evaluate(async () => (await import('/src/state/touch.ts')).touchMove.y > 0), 'joystick is not released');
    await page.waitForFunction(() => window.__ow.player.y < .01);
    // A swipe and a following single tap must not form a double tap.
    n = await jumps();
    await touch('touchStart', [...held, { x: 270, y: 340, id: 2 }]);
    await touch('touchMove', [...held, { x: 310, y: 340, id: 2 }]);
    await touch('touchEnd', [{ x: 310, y: 340, id: 2 }]);
    await tap();
    assert.equal(await jumps(), n, name + ': camera swipe is not a tap');
    // Pinch fingers belong to the camera, even with the joystick still held.
    await touch('touchStart', [...held, { x: 240, y: 340, id: 2 }, { x: 290, y: 340, id: 3 }]);
    await touch('touchMove', [...held, { x: 220, y: 340, id: 2 }, { x: 310, y: 340, id: 3 }]);
    await touch('touchEnd', [{ x: 220, y: 340, id: 2 }, { x: 310, y: 340, id: 3 }]);
    await tap();
    assert.equal(await jumps(), n, name + ': pinch and following tap do not jump');
    await page.evaluate(() => window.__ow.game.getState().setTool('wall'));
    await pair();
    assert.equal(await jumps(), n, name + ': building gestures do not jump');
    await page.evaluate(() => window.__ow.game.getState().setTool('select'));
    await touch('touchEnd', held); held = [];
    await page.evaluate(() => Object.assign(window.__ow.player, { x: 8, y: 0, z: 12, yaw: 0, bodyYaw: 0 }));
    await page.waitForTimeout(400);
    console.log('PASS ' + name + ': held joystick + canvas double tap keeps moving and jumps; swipe rejected');
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
