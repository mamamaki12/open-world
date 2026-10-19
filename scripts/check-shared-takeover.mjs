import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';

const relay=createRelay();await relay.ready;await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
const endpoint='ws://127.0.0.1:'+relay.http.address().port;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844}}),errors=[];
fs.mkdirSync('browser-checks/shared-ui',{recursive:true});
async function until(page,fn){for(const end=Date.now()+90000;Date.now()<end;await page.waitForTimeout(100))if(await page.evaluate(fn))return;throw Error('Timed out: '+fn);}
async function open(ctx=context){const p=await ctx.newPage();p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));await p.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:5190/')+'?touch=1&relay='+encodeURIComponent(endpoint));await p.getByLabel('あなたの名前').waitFor();return p;}
async function join(p){await p.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();await until(p,async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected'&&!!(await import('/src/session/saves.ts')).savedBundle().wallet);await p.evaluate(()=>window.__ow.game.getState().setOverlay('map'));}
async function settled(p){await until(p,async()=>!(await import('/src/session/saves.ts')).savedBundle().wallet?.pending.length);}
try{
 const old=await open();await old.getByLabel('あなたの名前').fill('引継ぎテスト');await join(old);await settled(old);
 const home=await old.evaluate(async()=>JSON.stringify((await import('/src/session/saves.ts')).savedBundle().home));
 await old.evaluate(async()=>{window.__ow.economy.getState().receive(1234,'takeover test');await(await import('/src/session/saves.ts')).persist();});await settled(old);
 const newer=await open();await join(newer);await old.getByRole('button',{name:'開始画面へ戻る',exact:true}).waitFor();
 assert.equal(await old.evaluate(async()=>(await import('/src/session/gate.ts')).sessionGate.superseded),true);
 assert.equal(await old.locator('canvas').count(),0,'old world rendering is released');
 assert.ok((await old.getByRole('button',{name:'開始画面へ戻る',exact:true}).boundingBox()).height>=44,'return action remains touchable');
 assert.equal(await newer.evaluate(()=>window.__ow.economy.getState().money),1001234);
 await newer.evaluate(async()=>{window.__ow.economy.getState().receive(234,'new screen');await(await import('/src/session/saves.ts')).persist();});await settled(newer);await newer.evaluate(async()=>await(await import('/src/session/saves.ts')).persist());
 await old.evaluate(async()=>{window.__ow.economy.getState().receive(9999,'stale screen');await(await import('/src/session/saves.ts')).persist();});await newer.waitForTimeout(2300);
 const stored=await newer.evaluate(async()=>await(await import('/src/session/database.ts')).readSave());assert.equal(stored.profile.money,1001468,'old screen must not overwrite the new save');
 assert.equal(JSON.stringify(stored.home),home,'personal world remains intact');
 assert.equal(relay.world().accounts[stored.profile.id].money,1001468);
 await old.screenshot({path:'browser-checks/shared-ui/takeover-old.png'});await newer.screenshot({path:'browser-checks/shared-ui/takeover-new.png'});
 await old.getByRole('button',{name:'開始画面へ戻る',exact:true}).click();await old.getByLabel('あなたの名前').waitFor();assert.equal(relay.world().accounts[stored.profile.id].money,1001468);
 // A copied save in an independent browser storage also takes over the same guest.
 const independent=await browser.newContext({viewport:{width:1000,height:720}}),third=await open(independent);
 await third.evaluate(async text=>(await import('/src/session/saves.ts')).importSave(text),JSON.stringify(stored));await join(third);await newer.getByRole('button',{name:'開始画面へ戻る',exact:true}).waitFor();
 assert.equal(await third.evaluate(()=>window.__ow.economy.getState().money),1001468);assert.equal(relay.world().economy.lots.length,0);
 assert.equal(await third.evaluate(async()=>(await import('/src/session/session.ts')).useSession.getState().members.length),1);
 assert.deepEqual(errors,[]);console.log('same-storage tabs / independent copied profile / old writes blocked / money and home kept / roster 1 passed');
}finally{await browser.close();relay.close();}
