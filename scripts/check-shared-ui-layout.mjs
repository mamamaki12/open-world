import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {createRelay} from '../server/dist/relay.mjs';
const relay=createRelay();await relay.ready;await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
let paused=false;relay.wss.on('connection',s=>{if(paused)s.terminate();});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});page.setDefaultTimeout(90000);
const out='browser-checks/shared-ui';fs.mkdirSync(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function until(fn){for(const end=Date.now()+90000;Date.now()<end;await page.waitForTimeout(100))if(await page.evaluate(fn))return;throw Error('Condition timed out: '+fn);}
async function shot(name){await page.screenshot({path:out+'/'+name+'.png'});console.log('screen',name);}
async function open(id){await page.evaluate(id=>window.__ow.game.getState().setOverlay(id),id);await page.getByRole('dialog').first().waitFor();}
async function close(){await page.getByRole('button',{name:'閉じる',exact:true}).click();}
async function fits(){const b=await page.getByRole('dialog').first().evaluate(e=>({w:e.clientWidth,s:e.scrollWidth,x:e.getBoundingClientRect().x}));assert.ok(b.s<=b.w+1&&b.x>=0,JSON.stringify(b));assert.ok(await page.getByRole('button',{name:'閉じる',exact:true}).isVisible());}
try{
 await page.goto(`http://127.0.0.1:${process.env.QA_PORT||5188}/?touch=1&relay=${encodeURIComponent('ws://127.0.0.1:'+relay.http.address().port)}`);await page.getByLabel('あなたの名前').fill('UI-Layout');await page.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();await until(async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected');console.log('joined');
 await page.getByRole('button',{name:'建築メニューを開く'}).click();await page.locator('.build-menu-prefabs .tool-card').first().click();assert.match(await page.evaluate(()=>window.__ow.game.getState().message.text),/土地を購入/);
 await open('map');paused=true;for(const s of relay.wss.clients)s.terminate();await until(async()=>(await import('/src/session/session.ts')).useSession.getState().status==='reconnecting');await page.locator('.modal-network-warning').waitFor();const warning=await page.locator('.modal-network-warning').boundingBox(),head=await page.locator('.map-close').boundingBox();assert.ok(warning.x+warning.width<=head.x||warning.y>=head.y+head.height,'network message must not cover the map close button');assert.equal(await page.locator('.world-network-warning').count(),0);await shot('reconnecting-map');paused=false;await until(async()=>(await import('/src/session/session.ts')).useSession.getState().status==='connected');await close();console.log('reconnect passed');
 for(const [width,height]of [[320,568],[844,390]]){
  await page.setViewportSize({width,height});for(const id of ['map','estate','casino','closet']){await open(id);await fits();await shot(`${width}-${id}`);await close();}
 }
 await page.setViewportSize({width:390,height:844});await open('casino');
 for(const scene of ['slot','wheel','cards','turf','track','water']){await page.locator(`.casino-game-card[data-scene="${scene}"]`).click();await fits();await shot('casino-'+scene);await page.getByRole('button',{name:'ゲーム選択に戻る',exact:false}).click();}
 await close();await page.getByRole('button',{name:'メニュー',exact:true}).click();await page.getByRole('button',{name:'建築に戻る',exact:false}).click();await page.getByRole('button',{name:'メニュー',exact:true}).click();await page.getByRole('button',{name:'セーブ',exact:false}).click();await page.getByRole('button',{name:'保存して開始画面へ',exact:true}).click();await page.getByLabel('あなたの名前').waitFor();await page.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();await until(async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected');
 for(const socket of relay.wss.clients)socket.send(JSON.stringify({type:'error',message:'検証用の接続終了'}));await page.getByText('接続が終了しました',{exact:true}).waitFor();const box=await page.locator('.world-disconnected').boundingBox();assert.deepEqual(box,{x:0,y:0,width:390,height:844});await shot('closed-after');await page.getByRole('button',{name:'自分の町へ戻る',exact:true}).click();await page.getByLabel('あなたの名前').waitFor();assert.deepEqual(errors,[]);console.log('Phone portrait/landscape, 6 casino games, reconnect, build exit/rejoin, closed dialog passed');
}catch(e){console.error(e);try{console.log(await page.locator('body').innerText());await shot('layout-failure');}catch{}process.exitCode=1;}
finally{await browser.close();relay.close();}
