import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';

const out='browser-checks/shared-floor';fs.mkdirSync(out,{recursive:true});
const relay=createRelay();await relay.ready;await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const pages=[],errors=[];
async function until(p,fn,arg){for(const end=Date.now()+90000;Date.now()<end;await p.waitForTimeout(100))if(await p.evaluate(fn,arg))return;throw Error('Shared floor timeout: '+fn);}
const settled=p=>until(p,async()=>!(await import('/src/session/session.ts')).useSession.getState().busy&&!(await import('/src/session/saves.ts')).savedBundle().wallet?.pending.length);
async function open(name,touch){
  const context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:900,height:650},hasTouch:touch,isMobile:touch});const page=await context.newPage();pages.push(page);page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/')+'?touch='+Number(touch)+'&relay='+encodeURIComponent('ws://127.0.0.1:'+relay.http.address().port));
  await page.getByLabel('あなたの名前').fill(name);await page.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();
  await until(page,async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected');await page.evaluate(()=>window.__ow.economy.setState({tick:()=>{}}));
  return {page,context};
}
try {
  const {page:owner}=await open('床の持ち主',false),{page:friend,context}=await open('横画面の共同建築',true);
  for(const p of pages)await until(p,async()=>(await import('/src/session/session.ts')).useSession.getState().members.length===2);
  await owner.evaluate(()=>window.__ow.economy.getState().receive(2000000000,'QA'));await settled(owner);
  await owner.evaluate(()=>{const e=window.__ow.economy.getState();const error=e.buyLand(e.offers[0].id);if(error)throw Error(error);});
  for(const p of pages)await until(p,()=>window.__ow.economy.getState().lots.length===1);await settled(owner);
  const member=await friend.evaluate(async()=>{const p=(await import('/src/session/saves.ts')).savedBundle().profile;return {id:p.id,name:p.name};});
  await owner.evaluate(async member=>{const e=window.__ow.economy.getState();(await import('/src/session/gate.ts')).sessionGate.act(e.lots[0].id,{type:'builders',...member,allow:true},0);},member);
  await until(friend,()=>window.__ow.economy.getState().lots[0].builders?.length===1);await settled(owner);
  for(const p of pages)await p.evaluate(()=>{const e=window.__ow.economy.getState();e.switchLot(e.lots[0].id);});
  await owner.evaluate(async()=>{const {emptyHouse}=await import('/src/building/types.ts'),finish={material:'flooring',color:'#c8a57a'};
    window.__ow.game.getState().commit({...emptyHouse(),walls:[{id:'support',level:0,x0:1,x1:1,z0:1,z1:4,exterior:finish,interior:finish}],floors:[{id:'root',level:1,x0:1,x1:4,z0:1,z1:4,finish}]});});
  for(const p of pages)await until(p,()=>window.__ow.game.getState().house.floors.some(f=>f.id==='root'));await settled(owner);
  await friend.evaluate(()=>{const g=window.__ow.game.getState();g.setMode('build');g.setOverlay(null);g.setTool('select');});
  await friend.getByRole('button',{name:'建築メニューを開く',exact:true}).click();await friend.locator('[data-tool="floor"]').click();await friend.getByRole('button',{name:'決定',exact:true}).click();
  await friend.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const s=_roots.get(document.querySelector('canvas')).store.getState();s.controls.target.set(2.5,3.4,2.5);s.camera.position.set(25,14,28);s.controls.update();s.camera.updateMatrixWorld();s.scene.updateMatrixWorld(true);window.__ow.game.getState().setLevel(0);});await friend.waitForTimeout(500);
  const project=(x,z)=>friend.evaluate(({x,z})=>window.__ow.project(x*.91,3.4,z*.91),{x,z});
  const a=await project(2.2,1.2),b=await project(5.8,3.8),cdp=await context.newCDPSession(friend);
  const camera=await friend.evaluate(()=>window.__ow.camera.position.toArray());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
  assert.equal(await friend.evaluate(async()=>(await import('/src/state/gestures.ts')).touchGesture.reserved),true,'upper-floor touch must reserve building, even when ground projection is outside the lot');
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  for(const p of pages)await until(p,()=>window.__ow.game.getState().house.floors.length===2);await settled(friend);
  const floors=await friend.evaluate(()=>window.__ow.game.getState().house.floors);assert.deepEqual(floors.map(({id,level,x0,x1,z0,z1})=>({id:id==='root'?'root':'added',level,x0,x1,z0,z1})),[{id:'root',level:1,x0:1,x1:4,z0:1,z1:4},{id:'added',level:1,x0:4,x1:6,z0:1,z1:4}]);
  assert.deepEqual(await owner.evaluate(()=>window.__ow.game.getState().house.floors),floors,'other browser receives the same extension');
  assert.deepEqual(await friend.evaluate(()=>window.__ow.camera.position.toArray()),camera,'drag builds without rotating the camera');
  await friend.screenshot({path:out+'/landscape-oblique-extension.png'});
  await friend.getByRole('button',{name:'取り消し',exact:true}).click();for(const p of pages)await until(p,()=>window.__ow.game.getState().house.floors.length===1);await settled(friend);
  assert.equal(await owner.evaluate(()=>window.__ow.game.getState().house.floors[0].id),'root');assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/results.json',JSON.stringify({status:'passed',landscape:{width:844,height:390},oblique:true,staleLevel:0,builder:true,remoteSync:true,undo:true},null,2));
  console.log('shared builder / landscape oblique edge / stale level / same-floor extension / camera unchanged / remote sync / undo passed');
}catch(e){for(const[i,p]of pages.entries())try{await p.screenshot({path:out+'/failure-'+i+'.png'});console.log('diagnostic',i,await p.locator('body').innerText());}catch{}throw e;}
finally{await browser.close();relay.close();}
