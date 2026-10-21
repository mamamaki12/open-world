import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';
const out='browser-checks/shared-target';fs.mkdirSync(out,{recursive:true});
const relay=createRelay();await relay.ready;await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const pages=[],errors=[],url=(process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/')+'?relay='+encodeURIComponent('ws://127.0.0.1:'+relay.http.address().port);
async function until(p,fn,arg){for(const end=Date.now()+90000;Date.now()<end;await p.waitForTimeout(100))if(await p.evaluate(fn,arg))return;throw Error('Editing target timeout: '+fn);}
const settled=p=>until(p,async()=>!(await import('/src/session/session.ts')).useSession.getState().busy&&!(await import('/src/session/saves.ts')).savedBundle().wallet?.pending.length);
async function join(p){await p.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();await until(p,async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected');await p.evaluate(()=>window.__ow.economy.setState({tick:()=>{}}));await settled(p);}
async function open(name,touch){const context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:900,height:650},isMobile:touch,hasTouch:touch}),p=await context.newPage();pages.push(p);p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));await p.goto(url+'&touch='+Number(touch));await p.getByLabel('あなたの名前').fill(name);await join(p);return{p,context};}
async function buy(p){
  await p.evaluate(()=>{window.__ow.game.getState().setMode('build');window.__ow.economy.getState().receive(2000000000,'QA');});await settled(p);
  const id=await p.evaluate(async()=>{const e=window.__ow.economy.getState(),offer=e.offers[0],me=(await import('/src/session/saves.ts')).savedBundle().profile.id;const error=e.buyLand(offer.id);if(error)throw Error(error);return {plot:offer.plot,me};});
  await until(p,({plot,me})=>{const e=window.__ow.economy.getState();return e.lots.some(l=>l.plot===plot&&l.owner===me)&&e.currentLotId===e.lots.find(l=>l.plot===plot).id;},id);await settled(p);
  return p.evaluate(()=>window.__ow.economy.getState().currentLotId);
}
const seed=async()=>{const {emptyHouse}=await import('/src/building/types.ts'),finish={material:'flooring',color:'#c8a57a'};window.__ow.game.getState().commit({...emptyHouse(),walls:[{id:'support',level:0,x0:1,x1:1,z0:1,z1:4,exterior:finish,interior:finish}],floors:[{id:'personal-root',level:1,x0:1,x1:4,z0:1,z1:4,finish}]});};
try{
  const {p:a}=await open('先に買った人',false),{p:b,context}=await open('自分の土地で建てる人',true);
  const first=await buy(a);await until(b,()=>window.__ow.economy.getState().lots.length===1);
  const own=await buy(b);assert.notEqual(own,first);
  assert.equal(await a.evaluate(()=>window.__ow.economy.getState().currentLotId),first,'other player’s purchase must not change my editing target');
  await b.evaluate(seed);await until(b,()=>window.__ow.game.getState().house.floors.length===1);await settled(b);
  await until(a,own=>{const l=window.__ow.economy.getState().lots.find(l=>l.id===own);return (l?.design??l?.built)?.floors.length===1;},own);
  assert.equal(await a.evaluate(()=>window.__ow.game.getState().house.floors.length),0,'the first player’s property stays untouched');
  const identity=await b.evaluate(async()=>(await import('/src/session/saves.ts')).savedBundle().profile.id);
  await b.evaluate(async()=>(await import('/src/session/session.ts')).leaveWorld());await b.getByLabel('あなたの名前').waitFor();await b.reload();await b.getByLabel('あなたの名前').waitFor();await join(b);
  assert.equal(await b.evaluate(async()=>(await import('/src/session/saves.ts')).savedBundle().profile.id),identity);
  assert.equal(await b.evaluate(()=>window.__ow.economy.getState().currentLotId),own,'re-entry must select my lot rather than the first player’s');
  await b.evaluate(()=>{const g=window.__ow.game.getState();g.setMode('build');g.setTool('select');});
  await b.getByRole('button',{name:'建築メニューを開く',exact:true}).click();await b.locator('[data-tool="floor"]').click();await b.getByRole('button',{name:'決定',exact:true}).click();
  await b.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const s=_roots.get(document.querySelector('canvas')).store.getState();s.controls.target.set(2.5,3.4,2.5);s.camera.position.set(25,14,28);s.controls.update();s.camera.updateMatrixWorld();s.scene.updateMatrixWorld(true);window.__ow.game.getState().setLevel(0);});await b.waitForTimeout(500);
  const project=(x,z)=>b.evaluate(({x,z})=>window.__ow.project(x*.91,3.4,z*.91),{x,z}),start=await project(2.2,1.2),end=await project(5.8,3.8),cdp=await context.newCDPSession(b);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/8,y:start.y+(end.y-start.y)*i/8}]});
  const preview=await b.evaluate(async()=>(await import('/src/state/interaction.ts')).useInteraction.getState().preview);assert(preview?.kind==='rect'&&preview.valid,'a valid blue floor preview is shown');
  await b.screenshot({path:out+'/blue-preview-own-second-lot.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await until(b,()=>window.__ow.game.getState().house.floors.length===2);await settled(b);
  await until(a,own=>{const l=window.__ow.economy.getState().lots.find(l=>l.id===own);return (l?.design??l?.built)?.floors.length===2;},own);
  const remoteFloors=await a.evaluate(own=>{const l=window.__ow.economy.getState().lots.find(l=>l.id===own);return (l.design??l.built).floors;},own);
  assert.deepEqual(remoteFloors,await b.evaluate(()=>window.__ow.game.getState().house.floors),'both browsers agree on the owner’s floor data');
  assert.equal(await a.evaluate(()=>window.__ow.game.getState().house.floors.length),0);
  await b.screenshot({path:out+'/built-own-second-lot.png'});
  await b.getByRole('button',{name:'取り消し',exact:true}).click();await until(b,()=>window.__ow.game.getState().house.floors.length===1);await settled(b);
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({status:'passed',twoOwners:true,purchaseSelectsOwn:true,reloadSelectsOwn:true,identityPreserved:true,bluePreview:true,remoteSync:true,neighborUntouched:true,undo:true},null,2));
  console.log('two owners / automatic purchase target / reload and re-entry / identity preserved / blue floor preview / own extension / remote sync / neighbor untouched / undo passed');
}catch(e){for(const[i,p]of pages.entries())try{console.log('target diagnostic',i,await p.locator('body').innerText());console.log(await p.evaluate(()=>({current:window.__ow.economy.getState().currentLotId,lots:window.__ow.economy.getState().lots.map(l=>({id:l.id,owner:l.owner,plot:l.plot}))})));await p.screenshot({path:out+'/failure-'+i+'.png'});}catch{}throw e;}
finally{await browser.close();relay.close();}
