// みんなのワールドに入ったとき、カジノの入口の前に立ち、カジノを背にして（町の方を向いて）始まることを確かめる（しんご 2026-11-10）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {createRelay} from '../server/dist/relay.mjs';
const relay=createRelay();await relay.ready;await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(90000);
const out='browser-checks/spawn-facing';fs.mkdirSync(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function until(fn){for(const end=Date.now()+90000;Date.now()<end;await page.waitForTimeout(100))if(await page.evaluate(fn))return;throw Error('Condition timed out: '+fn);}
try{
 await page.goto(`http://127.0.0.1:${process.env.QA_PORT||5188}/?relay=${encodeURIComponent('ws://127.0.0.1:'+relay.http.address().port)}`);await page.getByLabel('あなたの名前').fill('Spawn');await page.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();
 await until(async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected'&&window.__ow.game.getState().mode==='walk');
 await page.waitForTimeout(1500);
 const r=await page.evaluate(async()=>{const {playerMemory}=await import('/src/world/Player.tsx');const {civicOffset}=await import('/src/state/economy.ts');const {VENUES}=await import('/src/building/venues.ts');
  const o=civicOffset();return {yaw:playerMemory.yaw,bodyYaw:playerMemory.bodyYaw,z:playerMemory.z,casinoZ:o.z+VENUES.casino.z0};});
 console.log(JSON.stringify(r));
 // 前を向く向きは (-sin yaw, -cos yaw)。カジノは +z 側にあるので、前が -z（カジノと反対）なら cos(yaw) > 0
 assert.ok(r.z<r.casinoZ,'not in front of casino');
 assert.ok(Math.cos(r.yaw)>0.99&&Math.cos(r.bodyYaw)>0.99,'should face away from the casino');
 await page.screenshot({path:out+'/start.png'});
 assert.deepEqual(errors,[]);console.log('Spawn faces away from casino');
}catch(e){console.error(e);try{await page.screenshot({path:out+'/failure.png'});}catch{}process.exitCode=1;}
finally{await browser.close();relay.close();}
