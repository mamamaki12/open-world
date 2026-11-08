// 建築画面：スマホで床・壁をドラッグすると広い範囲にまとめて置ける。
// 歩く画面（三人称）：同じようにドラッグしても床・壁は1ブロックだけ（照準のときは check-aim-controls.mjs）。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const out='browser-checks/block-vs-range';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const cdp=await context.newCDPSession(page);
const drag=async(a,b)=>{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8}]});await page.waitForTimeout(60);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);
};
const house=()=>page.evaluate(()=>window.__ow.game.getState().house);
const pts=(a,b)=>page.evaluate(([a,b])=>{const G=0.91;window.__ow.scene.updateMatrixWorld(true);return [window.__ow.project(a[0]*G,0.5,a[1]*G),window.__ow.project(b[0]*G,0.5,b[1]*G)];},[a,b]);
try{
  await page.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/')+'?play=1&touch=1');await page.waitForFunction(()=>window.__ow?.scene);
  // 建築画面
  await page.evaluate(async()=>{const {emptyHouse}=await import('/src/building/types.ts');const g=window.__ow.game.getState();g.setMode('build');g.setOverlay(null);g.replaceHouse(emptyHouse());g.setTool('floor');});
  await page.waitForTimeout(1200);
  let [a,b]=await pts([10.5,7.5],[13.5,11.5]);
  await drag(a,b);
  let h=await house();
  assert.equal(h.floors.length,1,'build screen: one drag = one floor');
  const area=f=>(f.x1-f.x0)*(f.z1-f.z0);
  assert.ok(area(h.floors[0])>=12,`build screen: drag covers a wide area (got ${area(h.floors[0])} cells)`);
  await page.evaluate(()=>window.__ow.game.getState().setTool('wall'));await page.waitForTimeout(600);
  [a,b]=await pts([12,6],[12,12]);
  await drag(a,b);
  h=await house();
  assert.equal(h.walls.length,1);
  assert.ok(Math.abs(h.walls[0].z1-h.walls[0].z0)>=4,'build screen: drag makes a long wall');
  await page.screenshot({path:`${out}/build-range.png`});
  // 歩く画面（三人称・照準を使わない）
  await page.evaluate(async()=>{
    const {emptyHouse}=await import('/src/building/types.ts');const {useControls}=await import('/src/state/controls.ts');
    useControls.setState({aimBuild:false});
    const g=window.__ow.game;g.getState().replaceHouse(emptyHouse());g.getState().setMode('walk');g.setState({view:'third'});
    Object.assign(window.__ow.player,{x:6,y:0,z:14,yaw:0,bodyYaw:0});
    g.getState().setTool('floor');
  });
  await page.waitForTimeout(1500);
  for(const tool of ['floor','wall']){
    await page.evaluate(t=>window.__ow.game.getState().setTool(t),tool);await page.waitForTimeout(600);
    [a,b]=tool==='floor'?await pts([4.5,8.5],[8.5,10.5]):await pts([4.1,8.5],[4.1,11.5]);
    const n=(await house())[tool==='floor'?'floors':'walls'].length;
    await drag(a,b);
    h=await house();const list=h[tool==='floor'?'floors':'walls'];
    assert.equal(list.length,n+1,`walk screen: ${tool} placed at release point`);
    const p=list[list.length-1];
    if(tool==='floor')assert.equal(area(p),1,'walk screen: floor is one block');
    else assert.equal(Math.abs(p.x1-p.x0)+Math.abs(p.z1-p.z0),1,'walk screen: wall is one block long');
  }
  await page.screenshot({path:`${out}/walk-block.png`});
  assert.deepEqual(errors,[]);console.log('block vs range passed');
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});console.error(await house().catch(()=>null));throw e;}finally{await browser.close();}
