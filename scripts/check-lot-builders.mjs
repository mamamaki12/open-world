// みんなのワールド：持ち主が友達を「一緒に建てる人」にすると、友達がその土地へワープして建てられる
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {createRelay} from '../server/dist/relay.mjs';
const relay=createRelay();await relay.ready;await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
const out='browser-checks/lot-builders';fs.mkdirSync(out,{recursive:true});
const browsers=[],pages=[],errors=[];
async function until(p,fn,arg){for(const end=Date.now()+120000;Date.now()<end;await p.waitForTimeout(100))if(await p.evaluate(fn,arg))return;throw Error('Timeout '+fn);}
async function open(name){const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding'],headless:true});browsers.push(browser);const p=await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();pages.push(p);p.setDefaultTimeout(120000);p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${process.env.QA_PORT||5173}/?touch=0&relay=${encodeURIComponent('ws://127.0.0.1:'+relay.http.address().port)}`);await p.getByLabel('あなたの名前').fill(name);await p.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();await until(p,async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected');await p.evaluate(()=>window.__ow.economy.setState({tick:()=>{}}));return p;}
const settled=p=>until(p,async()=>!(await import('/src/session/saves.ts')).savedBundle().wallet?.pending.length&&!(await import('/src/session/session.ts')).useSession.getState().busy);
try{
 const owner=await open('持ち主'),friend=await open('友達');
 for(const p of pages)await until(p,async()=>(await import('/src/session/session.ts')).useSession.getState().members.length===2);
 await owner.evaluate(()=>window.__ow.economy.getState().receive(2000000000,'QA'));await settled(owner);
 await owner.evaluate(async()=>{const{sessionGate}=await import('/src/session/gate.ts');sessionGate.act('',{type:'buyLand',offer:window.__ow.economy.getState().offers[0].id},1000000000);});
 await until(owner,()=>window.__ow.economy.getState().lots.length===1);await settled(owner);
 await owner.evaluate(()=>{const e=window.__ow.economy.getState();e.switchLot(e.lots[0].id);window.__ow.game.getState().setOverlay('estate');});await owner.getByRole('button',{name:'この土地の家',exact:true}).click();
 await owner.getByRole('button',{name:'建てられるようにする',exact:true}).click();
 await until(friend,()=>!!window.__ow.economy.getState().lots[0]?.builders?.length);
 await owner.screenshot({path:out+'/owner-estate.png'});console.log('friend allowed');
 await friend.evaluate(()=>window.__ow.game.getState().setOverlay('map'));await friend.getByRole('button',{name:'ワープ',exact:true}).first().click();
 await until(friend,()=>{const e=window.__ow.economy.getState();return e.currentLotId===e.lots[0].id;});
 await friend.getByRole('button',{name:'建築に戻る',exact:false}).click();await friend.getByRole('button',{name:'セーブ',exact:false}).click();await friend.getByRole('button',{name:'サンプルの家',exact:true}).click();
 await until(owner,()=>window.__ow.game.getState().house.walls.length>0);await settled(friend);console.log('friend built on owner lot');
 await friend.screenshot({path:out+'/friend-built.png'});
 await owner.getByRole('button',{name:'外す',exact:true}).click();
 await until(friend,()=>!window.__ow.economy.getState().lots[0]?.builders);console.log('friend removed');
 assert.deepEqual(errors,[]);
}catch(e){console.error(e);for(const[i,p]of pages.entries())try{await p.screenshot({path:out+'/failure-'+i+'.png'});console.log('failure',i,(await p.locator('body').innerText()).slice(0,800));}catch{}process.exitCode=1;}
finally{for(const b of browsers)await b.close();relay.close();}
