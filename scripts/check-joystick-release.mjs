// スマホの移動スティック：指を離したら必ず戻る。スティックの要素に pointerup が届かなくても（別の指と同時に触ったときなど）戻り、
// 戻りそこねても次にスティックに触った指で操作し直せる
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1});
// 届かなかったことにするイベント（アプリより先に登録して止める）
await context.addInitScript(()=>{window.__block=new Set();for(const t of ['pointerup','pointercancel','lostpointercapture','touchend','touchcancel'])window.addEventListener(t,e=>{if(window.__block.has(t))e.stopImmediatePropagation();},true);});
const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const cdp=await context.newCDPSession(page);
const knob=()=>page.$eval('.joystick-knob',el=>el.style.transform);
const block=(list)=>page.evaluate(l=>{window.__block=new Set(l);},list);
const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
try{
  await page.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/')+'?play=1&touch=1');await page.waitForFunction(()=>window.__ow?.scene);
  await page.evaluate(()=>window.__ow.game.getState().setMode('walk'));
  await page.waitForSelector('.joystick');await page.waitForTimeout(800);
  const r=await page.$eval('.joystick',el=>{const b=el.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};});
  const push=async(id=0)=>{await touch('touchStart',[{x:r.x,y:r.y,id}]);for(let i=1;i<=4;i++){await touch('touchMove',[{x:r.x,y:r.y-12*i,id}]);await page.waitForTimeout(40);}await page.waitForTimeout(100);};
  const centered=async()=>/translate\(0px, 0px\)/.test(await knob());
  // 1. ふつうに離す
  await push();assert.ok(!(await centered()),'knob moved');
  await touch('touchEnd',[]);await page.waitForTimeout(150);assert.ok(await centered(),'released normally');
  // 2. スティックに pointerup/pointercancel/lostpointercapture が届かなくても、touchend で戻る
  await block(['pointerup','pointercancel','lostpointercapture']);
  await page.waitForTimeout(400);
  await push();await touch('touchEnd',[]);await page.waitForTimeout(150);
  assert.ok(await centered(),'released by touchend when pointer events were lost');
  // 3. 離したイベントがすべて届かず固まっても、もう一度スティックに触れば操作し直せて、離せば戻る
  await block(['pointerup','pointercancel','lostpointercapture','touchend','touchcancel']);
  await page.waitForTimeout(400);
  await push(1);await touch('touchEnd',[]);await page.waitForTimeout(150);
  assert.ok(!(await centered()),'test setup: stick is stuck');
  await block([]);
  await page.waitForTimeout(400);
  await push(2);await touch('touchEnd',[]);await page.waitForTimeout(150);
  assert.ok(await centered(),'new touch takes over a stuck stick and releases');
  assert.deepEqual(errors,[]);
  console.log('ok: joystick release');
}finally{await browser.close();}
