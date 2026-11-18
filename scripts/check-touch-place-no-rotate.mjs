// スマホで置く道具（床・壁・屋根・階段・家具・窓・表札）を持っていて、置き始められる場所に触れた1本指ではカメラが回らない。指でずらして離した場所に置く。置けない場所（土地の外）から触れた指は回る（真上から見る床・壁だけは、線を引くつもりで回らないよう回さない）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const out='browser-checks/touch-place-no-rotate';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const cdp=await context.newCDPSession(page);
// 真上から見ているときは回しても位置がほとんど変わらないので、向きも比べる
const cam=()=>page.evaluate(()=>[...window.__ow.camera.position.toArray(),...window.__ow.camera.quaternion.toArray().map(v=>v*10)]);
const drag=async(a,b)=>{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8}]});await page.waitForTimeout(60);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);
};
try{
  await page.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/')+'?play=1&touch=1');await page.waitForFunction(()=>window.__ow?.scene);
  // 1階の壁で囲んだ部屋を作り、屋根を持つ
  await page.evaluate(()=>{
    const g=window.__ow.game.getState();g.setMode('build');g.setOverlay(null);
    const d=g.defaults,w=(x0,z0,x1,z1,i)=>({id:'chk-wall-'+i,level:0,x0,z0,x1,z1,exterior:d.wallExterior,interior:d.wallInterior,height:'full'});
    g.commit({...g.house,walls:[w(2,2,8,2,1),w(8,2,8,8,2),w(8,8,2,8,3),w(2,8,2,2,4)],floors:[],roofs:[]});
    g.setTool('roof');
  });
  await page.waitForTimeout(1200);
  // 壁の上端の高さで部屋の中をなぞる（斜めから見ているので、地面の高さで読むと別の場所になる）
  const pts=await page.evaluate(()=>{const G=0.91;
    const y=3.4;return [window.__ow.project(2.6*G,y,2.6*G),window.__ow.project(7.4*G,y,7.4*G)];});
  const before=await cam();
  await drag(pts[0],pts[1]);
  const after=await cam();
  await page.screenshot({path:`${out}/roof.png`});
  const moved=Math.hypot(...before.map((v,i)=>v-after[i]));
  assert.ok(moved<0.05,`camera rotated while placing roof (moved ${moved.toFixed(2)})`);
  assert.equal(await page.evaluate(()=>window.__ow.game.getState().house.roofs.length),1,'roof placed');
  // 階段・家具：土地の中で触れた指をずらしても回らず、離した場所に置く
  for(const tool of ['stair','furniture']){
    await page.evaluate(t=>{const g=window.__ow.game.getState();g.setTool(t);if(t==='furniture')g.setDefaults({furnitureType:'sofa'});},tool);await page.waitForTimeout(800);
    const [a,b]=await page.evaluate(()=>{const G=0.91;return [window.__ow.project(11*G,0.5,4*G),window.__ow.project(13*G,0.5,9*G)];});
    const count=()=>page.evaluate(t=>window.__ow.game.getState().house[t==='stair'?'stairs':'furniture'].length,tool);
    const n=await count(),c0=await cam();await drag(a,b);const c1=await cam();
    assert.ok(Math.hypot(...c0.map((v,i)=>v-c1[i]))<0.05,`camera rotated while dragging ${tool}`);
    assert.equal(await count(),n+1,`${tool} placed at release point`);
    await page.screenshot({path:`${out}/${tool}.png`});
  }
  // 窓・表札：壁に触れた指を壁の上でずらしても回らず、離した場所に置く
  for(const [tool,type,count] of [['window',null,'openings'],['furniture','nameplate','furniture']]){
    await page.evaluate(([t,f])=>{const g=window.__ow.game.getState();g.select(null);g.setTool(t);if(f)g.setDefaults({furnitureType:f});},[tool,type]);await page.waitForTimeout(800);
    const [a,b]=await page.evaluate(()=>{const G=0.91;return [window.__ow.project(3.2*G,1.8,2*G),window.__ow.project(6.2*G,1.8,2*G)];});
    const n=await page.evaluate(k=>window.__ow.game.getState().house[k].length,count),c0=await cam();await drag(a,b);const c1=await cam();
    assert.ok(Math.hypot(...c0.map((v,i)=>v-c1[i]))<0.05,`camera rotated while dragging ${type??tool} on a wall`);
    assert.equal(await page.evaluate(k=>window.__ow.game.getState().house[k].length,count),n+1,`${type??tool} placed on the wall`);
    await page.screenshot({path:`${out}/${type??tool}.png`});
  }
  await page.evaluate(()=>{const g=window.__ow.game.getState();g.select(null);g.setTool('roof');});await page.waitForTimeout(800);
  // 置く道具を持っていても、置き始められない場所（土地の外の手前の道）から触れた1本指では回り、何も置かない
  const far={x:120,y:800};
  for(const tool of ['roof','floor']){
    await page.evaluate(t=>window.__ow.game.getState().setTool(t),tool);await page.waitForTimeout(500);
    const parts=()=>page.evaluate(t=>window.__ow.game.getState().house[t==='roof'?'roofs':'floors'].length,tool);
    const n=await parts();
    // 床は真上から見るので、土地の端から1マス（置ける範囲）より外の、画面のいちばん下を使う
    const from=tool==='floor'?{x:120,y:838}:far;
    const b2=await cam();await drag(from,{x:from.x+120,y:from.y});const a2=await cam();
    const turned=Math.hypot(...b2.map((v,i)=>v-a2[i]))>0.05;
    if(tool==='floor')assert.ok(!turned,'top view (floor): one finger outside the lot must not rotate');
    else assert.ok(turned,`one finger outside the lot rotates while holding ${tool}`);
    assert.equal(await parts(),n,`nothing placed from outside the lot (${tool})`);
  }
  // 土地の中で床をなぞると回らず置ける
  const fp=await page.evaluate(()=>{const G=0.91;return [window.__ow.project(10*G,0,10*G),window.__ow.project(13*G,0,12*G)];});
  const nf=await page.evaluate(()=>window.__ow.game.getState().house.floors.length),b4=await cam();await drag(fp[0],fp[1]);const a4=await cam();
  assert.ok(Math.hypot(...b4.map((v,i)=>v-a4[i]))<0.05,'camera rotated while placing floor');
  assert.ok(await page.evaluate(()=>window.__ow.game.getState().house.floors.length)>nf,'floor placed');
  await page.screenshot({path:`${out}/floor.png`});
  // 手ぶらなら1本指で回る
  await page.evaluate(()=>window.__ow.game.getState().setTool('select'));await page.waitForTimeout(500);
  const b3=await cam();await drag(far,{x:far.x+120,y:far.y});const a3=await cam();
  assert.ok(Math.hypot(...b3.map((v,i)=>v-a3[i]))>0.05,'bare hands: one finger rotates');
  assert.deepEqual(errors,[]);console.log('touch place no-rotate passed');
}catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e;}finally{await browser.close();}
