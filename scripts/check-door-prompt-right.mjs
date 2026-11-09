// スマホの歩く画面で「ドアを開ける」などのボタンが右手の親指で押せる右寄りにあり、
// 削除・建てる・地図・👥・スティックと重ならないことを確かめる（しんご 2026-11-09）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {createRelay} from '../server/dist/relay.mjs';
const relay=createRelay();await relay.ready;await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});page.setDefaultTimeout(90000);
const out='browser-checks/door-prompt-right';fs.mkdirSync(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function until(fn){for(const end=Date.now()+90000;Date.now()<end;await page.waitForTimeout(100))if(await page.evaluate(fn))return;throw Error('Condition timed out: '+fn);}
const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
try{
 await page.goto(`http://127.0.0.1:${process.env.QA_PORT||5188}/?touch=1&relay=${encodeURIComponent('ws://127.0.0.1:'+relay.http.address().port)}`);await page.getByLabel('あなたの名前').fill('Door');await page.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();await until(async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected');
 await page.evaluate(()=>window.__ow.game.getState().setMode('walk'));await page.locator('.world-session-toggle').waitFor();
 // ドアの前に立ったことにする（毎フレーム上書きされるので繰り返し入れる）
 await page.evaluate(async()=>{const {useDoors}=await import('/src/state/doors.ts');useDoors.setState({target:'test-door'});useDoors.subscribe(s=>{if(!s.target)useDoors.setState({target:'test-door'});});});
 for(const tool of ['select','wall','erase'])for(const [width,height]of (process.env.SZ?JSON.parse(process.env.SZ):[[844,390],[667,375],[568,320],[932,430],[390,844],[320,568],[375,667]])){
  await page.evaluate(t=>window.__ow.game.getState().setTool(t),tool);await page.setViewportSize({width,height});await page.waitForTimeout(400);
  const p=await page.locator('.door-prompt').first().boundingBox();assert.ok(p,`${width}x${height}: no door prompt`);
  // 右下の 削除・建てる の列のすぐ左（列の幅はおよそ 100px）
  assert.ok(p.x+p.width>=width-130&&p.x+p.width/2>width/2,`${tool} ${width}x${height}: prompt not on the right ${JSON.stringify(p)}`);
  assert.ok(p.x>=0&&p.x+p.width<=width&&p.y>=0&&p.y+p.height<=height,`${tool} ${width}x${height}: prompt off screen`);
  for(const sel of ['.build-fab','.erase-fab','.touch-map','.world-session-toggle','.joystick','.touch-cash','.touch-hud .tool.icon','.aim-buttons button','.build-fab-away','.touch-actions .jump']){
   for(const b of await page.locator(sel).evaluateAll(es=>es.filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})))
    assert.ok(!hit(p,b),`${tool} ${width}x${height}: prompt overlaps ${sel} ${JSON.stringify({p,b})}`);
  }
  await page.screenshot({path:`${out}/${tool}-${width}x${height}.png`});console.log('ok',tool,width,height,JSON.stringify(p));
 }
 assert.deepEqual(errors,[]);console.log('Door prompt: right side, no overlap');
}catch(e){console.error(e);try{await page.screenshot({path:out+'/failure.png'});}catch{}process.exitCode=1;}
finally{await browser.close();relay.close();}
