// スマホで床などの道具を持ったとき、上に枠だけの横線が出ず、取り消し・やり直しは右上の地図の左の小さなアイコンで、👥／始点を決める／地図と重ならないことを確かめる
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {createRelay} from '../server/dist/relay.mjs';
const relay=createRelay();await relay.ready;await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:693,height:320},hasTouch:true,isMobile:true});page.setDefaultTimeout(90000);
const out='browser-checks/phone-build-top';fs.mkdirSync(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function until(fn){for(const end=Date.now()+90000;Date.now()<end;await page.waitForTimeout(100))if(await page.evaluate(fn))return;throw Error('Condition timed out: '+fn);}
const hit=(a,b)=>a&&b&&a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
try{
 await page.goto(`http://127.0.0.1:${process.env.QA_PORT||5173}/?touch=1&relay=${encodeURIComponent('ws://127.0.0.1:'+relay.http.address().port)}`);await page.getByLabel('あなたの名前').fill('TOP');await page.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();await until(async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected');
 await page.evaluate(()=>{const g=window.__ow.game.getState();g.setMode('walk');g.setTool('floor');});await page.locator('.touch-history [aria-label=やり直し]').waitFor();assert.equal(await page.locator('.build-history').count(),0,'center undo/redo bar still shown');
 for(const [width,height]of [[693,320],[844,390],[390,844],[375,667]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(300);
  const qt=await page.locator('.quick-tools').evaluate(e=>{const s=getComputedStyle(e);return{border:s.borderTopWidth,shadow:s.boxShadow,bg:s.backgroundColor};});
  assert.equal(qt.border,'0px',`${width}x${height}: quick-tools still has a border`);assert.equal(qt.shadow,'none');assert.equal(qt.bg,'rgba(0, 0, 0, 0)');
  const box=async s=>(await page.locator(s).count())?page.locator(s).first().boundingBox():null;
  const u=await box('.touch-history [aria-label=取り消し]'),h=await box('.touch-history [aria-label=やり直し]'),parts={chip:await box('.world-session-toggle'),place:await box('.aim-buttons'),map:await box('.touch-map'),cash:await box('.touch-cash'),menu:await box('.touch-hud .tool.icon')};
  assert.ok(u.width<=56&&h.width<=56,`${width}: undo/redo should be small icons`);
  for(const [n,b]of Object.entries(parts))for(const x of [u,h])assert.ok(!hit(x,b),`${width}x${height}: 取り消す/やり直す overlaps ${n} ${JSON.stringify({h,b})}`);
  assert.ok(!hit(parts.chip,parts.place),`${width}x${height}: 👥 overlaps 始点を決める`);
  assert.ok(u.y<80&&u.x>width/2,`${width}: undo/redo should sit top-right`);
  assert.ok(h.x>=0&&h.x+h.width<=width,`${width}: history off screen`);
  await page.screenshot({path:`${out}/${width}x${height}.png`});console.log('ok',width,height);
 }
 assert.deepEqual(errors,[]);console.log('Phone build top: no empty frame line, no overlaps');
}catch(e){console.error(e);try{await page.screenshot({path:out+'/failure.png'});}catch{}process.exitCode=1;}
finally{await browser.close();relay.close();}
