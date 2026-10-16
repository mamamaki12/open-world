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
  await page.getByRole('button',{name:'↶ 取り消す',exact:true}).tap();
  assert.equal(await page.evaluate(()=>window.__ow.game.getState().house.floors.length),0);
  await page.getByRole('button',{name:'↷ やり直す',exact:true}).tap();
  assert.equal(await page.evaluate(()=>window.__ow.game.getState().house.floors.length),1);
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
  await page.setViewportSize({width:390,height:844});await setup();
  await page.evaluate(async()=>{
    const {useVehicles}=await import('/src/state/vehicles.ts');
    const {driveButtons}=await import('/src/world/vehicleLogic.ts');
    const {CARS}=await import('/src/catalog/cars.ts');
    const {currentPlotOf}=await import('/src/state/economy.ts');
    const {plotX,plotZ}=await import('/src/economy/town.ts');
    const plot=currentPlotOf(window.__ow.economy.getState());
    window.__ow.game.setState({view:'third'});
    useVehicles.setState({cars:[{id:'test-drive',model:CARS[0].id,color:'#334455',x:8+plotX(plot),z:12+plotZ(plot),yaw:0,speed:0,steer:0,wheelSpin:0,braking:false,lights:false}],driving:'test-drive',target:null});
    window.__driveTest={useVehicles,driveButtons};
  });
  await page.locator('.drive-pedals').waitFor();
  assert.equal(await page.locator('.joystick').count(),0,'no driving joystick');
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(200);
    const boxes=await page.locator('.drive-steering button,.drive-pedals button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
    assert.equal(boxes.length,4);
    for(const b of boxes)assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=viewport.width&&b.y+b.h<=viewport.height&&b.w>=44&&b.h>=44,'driving buttons fit and remain tappable');
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'driving buttons do not overlap');}
    await page.screenshot({path:`control-checks/driving-${viewport.width}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  const driveCdp=await page.context().newCDPSession(page);
  const center=async label=>{const r=await page.getByRole('button',{name:label,exact:true}).boundingBox();return{x:r.x+r.width/2,y:r.y+r.height/2};};
  const accel=await center('アクセル'),left=await center('左にハンドルを切る'),right=await center('右にハンドルを切る'),brake=await center('ブレーキ');
  await driveCdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...accel,id:1},{...left,id:2}]});
  await page.waitForFunction(()=>{const d=window.__driveTest,c=d.useVehicles.getState().cars[0];return d.driveButtons.accelerator&&d.driveButtons.left&&c.speed>.3&&c.steer<-.02;});
  await driveCdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>!window.__driveTest.driveButtons.accelerator&&!window.__driveTest.driveButtons.left);
  await driveCdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...accel,id:1},{...right,id:2}]});
  await page.waitForFunction(()=>{const d=window.__driveTest;return d.driveButtons.right&&d.useVehicles.getState().cars[0].steer>.02;});
  await driveCdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForFunction(()=>!Object.values(window.__driveTest.driveButtons).some(Boolean));
  await driveCdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...brake,id:1}]});
  await page.waitForFunction(()=>{const c=window.__driveTest.useVehicles.getState().cars[0];return c.braking&&Math.abs(c.speed)<.05;});
  await page.evaluate(()=>window.__ow.game.getState().setOverlay('controls'));
  await page.waitForFunction(()=>!Object.values(window.__driveTest.driveButtons).some(Boolean));
  await driveCdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await driveCdp.detach();
  console.log('PASS mobile driving: four buttons, simultaneous accelerator/left/right, brake, cancellation and menu cleanup; undo/redo verified.');
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
  for(const sprint of [false,true]){
    await setup(); await page.bringToFront();
    await page.mouse.click(640,360); await page.waitForFunction(()=>document.pointerLockElement!==null);
    const start=await page.evaluate(()=>({x:window.__ow.player.x,z:window.__ow.player.z}));
    if(sprint){
      // 描画待ちの往復を挟まず、短いキー入力列をそのままゲームへ届ける。
      await page.evaluate(()=>{
        window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w'}));
        window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',key:'w'}));
        window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w'}));
      });
    }else await page.keyboard.down('KeyW');
    await page.waitForFunction(({sprint,start})=>window.__ow.motion.running===sprint && Math.hypot(window.__ow.player.x-start.x,window.__ow.player.z-start.z)>.4,{sprint,start});
    console.log('Movement confirmed:',{sprint,position:await page.evaluate(()=>({x:window.__ow.player.x,z:window.__ow.player.z}))});
    await page.keyboard.up('KeyW'); await page.waitForTimeout(400); await page.keyboard.press('Escape'); await page.waitForFunction(()=>document.pointerLockElement===null);
  }
  await setup(); await page.mouse.click(640,360); await page.waitForFunction(()=>document.pointerLockElement!==null);
  const jumps=await page.evaluate(()=>window.__ow.motion.jumps);
  await page.keyboard.down('Space');
  await page.waitForFunction(jumps=>window.__ow.motion.jumps>=jumps+2 && window.__ow.player.y>.1,jumps);
  await page.keyboard.up('Space'); await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.pointerLockElement===null);
  console.log('Held jump confirmed across two takeoffs.');
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
