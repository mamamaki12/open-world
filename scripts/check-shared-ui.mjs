import { chromium } from 'playwright';
import { createRelay } from '../server/dist/relay.mjs';
import fs from 'node:fs';
const out='browser-checks/shared-ui';fs.mkdirSync(out,{recursive:true});
const relay=createRelay();await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
const browsers=[],pages=[],errors=[];
async function until(page,fn,arg){for(const end=Date.now()+120000;Date.now()<end;await page.waitForTimeout(100))if(await page.evaluate(fn,arg))return;throw Error('Timeout: '+fn);}
async function shot(p,name){await p.screenshot({path:out+'/'+name+'.png'});console.log('screen',name);}
try{
 for(const [name,touch,width,height] of [['QA-PC',false,1280,800],['QA-Mobile',true,390,844]]){
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:true});browsers.push(browser);
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});const p=await context.newPage();pages.push(p);p.setDefaultTimeout(120000);p.on('pageerror',e=>errors.push(name+': '+e.message));
  await p.goto(`http://127.0.0.1:5185/?touch=${+touch}&relay=${encodeURIComponent('ws://127.0.0.1:'+relay.http.address().port)}`);
  await p.getByLabel('あなたの名前').fill(name);await shot(p,name+'-launcher');await p.getByRole('button',{name:'みんなのワールドで遊ぶ',exact:false}).click();
  await until(p,async()=>!!window.__ow&&(await import('/src/session/session.ts')).useSession.getState().status==='connected');
  await p.evaluate(()=>window.__ow.economy.setState({tick:()=>{}}));
 }
 for(const p of pages)await until(p,async()=>(await import('/src/session/session.ts')).useSession.getState().members.length===2);
 for(const [i,p]of pages.entries()){
  await shot(p,i+'-walk');await p.locator('.world-session-toggle').click();await shot(p,i+'-members');console.log('members',i,await p.locator('.world-session-panel').innerText());await p.locator('.world-session-toggle').click();
  for(const overlay of ['map','estate','casino','dealer','tuner','exchange','closet','looks-edit','jobs','inventory','controls']){
   await p.evaluate(o=>window.__ow.game.getState().setOverlay(o),overlay);await p.getByRole('dialog').first().waitFor();await shot(p,i+'-'+overlay);
   console.log('layout',i,overlay,await p.getByRole('dialog').first().evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,rect:e.getBoundingClientRect().toJSON(),close:[...e.querySelectorAll('button')].filter(b=>b.getAttribute('aria-label')==='閉じる').map(b=>b.getBoundingClientRect().toJSON())})));
   await p.getByRole('button',{name:'閉じる',exact:true}).click();
  }
  if(i===1){await p.getByRole('button',{name:'メニュー',exact:true}).click();await shot(p,'mobile-menu');await p.getByRole('button',{name:'建築に戻る',exact:false}).click();await p.getByRole('button',{name:'メニュー',exact:true}).click();await p.getByRole('button',{name:'セーブ',exact:false}).click();await shot(p,'mobile-build-save');console.log('mobile build save',await p.locator('.save-menu').innerText());}
 }
 console.log('errors',errors);
}catch(e){console.error(e);for(const[i,p]of pages.entries()){try{console.log('body',i,await p.locator('body').innerText());await shot(p,i+'-failure');}catch{}}process.exitCode=1;}
finally{for(const b of browsers)await b.close();relay.close();}
