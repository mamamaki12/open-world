// スマホの歩き画面で、左上の所持金・右上の地図ボタン・👥人数チップが重ならず、所持金が欠けないことを確かめる
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {createRelay} from '../server/dist/relay.mjs';
const relay=createRelay();await relay.ready;await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});page.setDefaultTimeout(90000);
const out='browser-checks/phone-top-hud';fs.mkdirSync(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function until(fn){for(const end=Date.now()+90000;Date.now()<end;await page.waitForTimeout(100))if(await page.evaluate(fn))return;throw Error('Condition timed out: '+fn);}
const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
try{
 await page.goto(`http://127.0.0.1:${process.env.QA_PORT||5188}/?touch=1&relay=${encodeURIComponent('ws://127.0.0.1:'+relay.http.address().port)}`);await page.getByLabel('あなたの名前').fill('HUD');await page.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();await until(async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected');
 await page.evaluate(()=>window.__ow.game.getState().setMode('walk'));await page.locator('.world-session-toggle').waitFor();
 for(const [width,height]of [[320,568],[375,667],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(300);
  const cash=page.locator('.touch-cash');const box=s=>page.locator(s).boundingBox();
  const c=await box('.touch-cash'),m=await box('.touch-hud .tool.icon'),map=await box('.touch-map'),chip=await box('.world-session-toggle');
  for(const [n,b]of [['cash',c],['menu',m],['map',map]])assert.ok(!hit(chip,b),`${width}x${height}: 👥 overlaps ${n} ${JSON.stringify({chip,b})}`);
  assert.ok(!hit(c,map),`${width}x${height}: cash overlaps map`);
  assert.ok(chip.x+chip.width<=width&&chip.x>=0,`${width}: chip off screen`);
  assert.ok(await cash.evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${width}: money text clipped`);
  await page.locator('.world-session-toggle').click();const panel=await box('.world-session-panel');assert.ok(panel.x>=0&&panel.x+panel.width<=width+1,`${width}: panel off screen ${JSON.stringify(panel)}`);
  await page.screenshot({path:`${out}/${width}x${height}.png`});await page.locator('.world-session-toggle').click();
  console.log('ok',width,height);
 }
 assert.deepEqual(errors,[]);console.log('Phone top HUD: no overlap at 320/375/390 portrait and 844 landscape');
}catch(e){console.error(e);try{await page.screenshot({path:out+'/failure.png'});}catch{}process.exitCode=1;}
finally{await browser.close();relay.close();}
