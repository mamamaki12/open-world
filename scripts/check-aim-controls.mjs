import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('control-checks', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let page;
const open = async (touch, viewport) => {
  const context = await browser.newContext({ viewport, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1 });
  page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:5173/?touch=${touch ? 1 : 0}`);
  await page.waitForFunction(() => window.__ow);
  await page.locator('.tool.mode').click();
  await setup(); return context;
};
const setup = async (wall = false) => {
  await page.evaluate(async wall => {
    const { emptyHouse } = await import('/src/building/types.ts');
    const { INITIAL_DEFAULTS } = await import('/src/state/store.ts');
    const g = window.__ow, h = emptyHouse();
    if (wall) h.walls.push({ id: 'test-wall', level: 0, x0: 4, z0: 8, x1: 14, z1: 8, exterior: INITIAL_DEFAULTS.wallExterior, interior: INITIAL_DEFAULTS.wallInterior });
    g.game.getState().replaceHouse(h); g.game.getState().setTool('select');
    Object.assign(g.player, { x: 8, y: 0, z: 12, yaw: 0, bodyYaw: 0, pitch: wall ? 0 : -.7 });
  }, wall);
  await page.waitForTimeout(600);
};
const tool = async n => page.getByRole('button', { name: new RegExp(`^${n}: `) }).tap();
const swipe = async (dx, dy) => {
  const cdp = await page.context().newCDPSession(page), v = page.viewportSize(), x = v.width / 2, y = v.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y: y + dy * i / 8 }] });
    await page.waitForTimeout(45);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
};
const place = async () => { await page.locator('.aim-place').waitFor(); await page.waitForTimeout(200); await page.locator('.aim-place').tap(); };
try {
  const mobile = await open(true, { width: 390, height: 844 });
  await tool(2); await place();
  assert.match(await page.locator('.aim-place').innerText(), /終点/);
  const yaw = await page.evaluate(() => window.__ow.player.yaw);
  await swipe(115, 0);
  assert.ok(Math.abs(await page.evaluate(() => window.__ow.player.yaw) - yaw) > .2, 'one-finger look while holding a range tool');
  await place();
  assert.equal(await page.evaluate(() => window.__ow.game.getState().house.floors.length), 1);
  await page.screenshot({ path: 'control-checks/mobile-floor.png' });
  await setup(); await tool(3); await place(); await swipe(130, 0); await place();
  assert.equal(await page.evaluate(() => window.__ow.game.getState().house.walls.length), 1);
  await setup(true); await tool(4); await place();
  assert.equal(await page.evaluate(() => window.__ow.game.getState().house.openings.length), 1);
  await page.evaluate(() => { window.__ow.player.x = 5.2; });
  await page.getByRole('button', { name: '種類・素材', exact: true }).tap();
  await page.locator('.inventory-tools').getByRole('button', { name: /家具/ }).tap();
  await page.getByRole('button', { name: '表札（壁付け）', exact: true }).tap();
  await page.getByRole('textbox', { name: '表札に表示する文字' }).fill('MY HOME');
  await page.getByRole('button', { name: 'この道具で戻る', exact: true }).tap(); await place();
  assert.equal(await page.evaluate(() => window.__ow.game.getState().house.furniture[0]?.label), 'MY HOME');
  assert.equal(await page.evaluate(() => window.__ow.game.getState().tool), 'select');
  await setup();
  await tool(8); await page.getByRole('button', { name: '種類・素材', exact: true }).tap();
  await page.getByRole('button', { name: 'チェア', exact: true }).tap();
  await page.getByRole('button', { name: 'この道具で戻る', exact: true }).tap(); await place();
  assert.equal(await page.evaluate(() => window.__ow.game.getState().house.furniture.length), 1);
  await tool(9);
  for(let i=0;i<12&&!await page.locator('.aim-place').isEnabled();i++){await swipe(0,-8);await page.waitForTimeout(150);}
  await page.locator('.aim-place').tap();
  assert.equal(await page.evaluate(() => window.__ow.game.getState().house.furniture.length), 1, 'brief tap must not delete');
  const box = await page.locator('.aim-place').boundingBox(), cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
  await page.waitForTimeout(550);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  assert.equal(await page.evaluate(() => window.__ow.game.getState().house.furniture.length), 0, 'hold deletes aimed item');
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport); await page.waitForTimeout(250);
    assert.equal(await page.locator('body').evaluate(e => e.scrollWidth), viewport.width, 'no horizontal page overflow');
    const action = await page.locator('.aim-place').boundingBox(), bar = await page.locator('.quick-tools').boundingBox();
    assert.ok(bar.y + bar.height < viewport.height / 2, 'hotbar leaves central view clear');
    assert.ok(action.x >= 0 && action.x + action.width <= viewport.width, 'action stays on screen');
    await page.screenshot({ path: `control-checks/mobile-${viewport.width}.png` });
  }
  console.log('PASS mobile: floor/wall/opening/nameplate/furniture, hold removal, one-finger look, 320/390/844px layouts.');
  await mobile.close();
  const desktop = await open(false, { width: 1280, height: 720 });
  await page.mouse.click(640, 360); await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.keyboard.press('Digit2'); await page.keyboard.press('Digit2'); await page.mouse.click(640, 360, { button: 'right' });
  await page.mouse.click(640, 360, { button: 'right' });
  assert.equal(await page.evaluate(() => window.__ow.game.getState().house.floors.length), 1, 'mouse places at central aim');
  assert.ok(await page.evaluate(() => !!document.pointerLockElement), 'switching tools keeps pointer lock');
  await page.mouse.wheel(0, 120); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.__ow.game.getState().tool), 'wall', 'wheel switches hotbar');
  await page.keyboard.press('Escape');
  const measure = async sprint => {
    await setup(); await page.waitForTimeout(350);
    const start=await page.evaluate(()=>window.__ow.player.z);
    if(sprint)await page.keyboard.press('KeyW');
    await page.keyboard.down('KeyW'); await page.waitForTimeout(600);
    const distance=start-await page.evaluate(()=>window.__ow.player.z);
    await page.keyboard.up('KeyW'); await page.waitForTimeout(350); return distance;
  };
  const walking=await measure(false),sprinting=await measure(true);
  console.log('Travel distance:',{walking,sprinting});
  assert.ok(sprinting>walking*1.3, 'double W sprints faster than walking');
  await setup(); await page.keyboard.down('Space');
  let rises=0,previous=0,falling=false; const heights=[];
  for(let i=0;i<25;i++){
    await page.waitForTimeout(100);const y=await page.evaluate(()=>window.__ow.player.y);heights.push(y);
    if(y<previous-.03)falling=true;
    if(y>previous+.03){if(falling||rises===0)rises++;falling=false;}previous=y;
  }
  await page.keyboard.up('Space');console.log('Held jump trajectory:',{rises,heights});
  assert.ok(rises>=2,'held jump jumps again after landing');
  await page.getByRole('button', { name: '操作設定', exact: true }).first().click();
  const slider=page.getByRole('slider', { name: '視点感度' }); await slider.focus(); await slider.press('Home'); for(let i=0;i<12;i++) await slider.press('ArrowRight');
  await page.getByRole('checkbox', { name: '上下の視点操作を反転' }).check();
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await page.reload(); await page.waitForFunction(() => window.__ow);
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('open-world:controls:v1')));
  assert.equal(prefs.sensitivity, 1.5); assert.equal(prefs.invertY, true);
  await page.locator('.tool.mode').click();
  await page.screenshot({ path: 'control-checks/desktop.png' });
  await desktop.close();
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('PASS: mobile aim floor/wall/opening/nameplate/furniture, hold-to-delete, one-finger look, 3 viewport layouts, desktop pointer-lock, right-click, wheel, double-W sprint, held jump and saved controls.');
} catch (error) {
  console.error('Browser errors:', errors);
  console.error('Player/house:',await page?.evaluate(()=>({p:window.__ow?.player,h:window.__ow?.game.getState().house})).catch(()=>null));
  console.error('Visible UI:', await page?.locator('body').innerText().catch(() => 'unavailable'));
  await page?.screenshot({ path: 'control-checks/failure.png' }).catch(() => {});
  throw error;
} finally { await browser.close(); }
