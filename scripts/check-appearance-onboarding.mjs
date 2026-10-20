import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { WebSocket, WebSocketServer } from 'ws';
import { createRelay } from '../server/dist/relay.mjs';
import { waitForCondition } from './wait-condition.mjs';

const relay=createRelay();await relay.ready;
await new Promise(resolve=>relay.http.listen(0,'127.0.0.1',resolve));
// Hold the first world snapshot until App has mounted, reproducing the startup race.
const proxy=new WebSocketServer({port:0,host:'127.0.0.1'});
await new Promise(resolve=>proxy.on('listening',resolve));
proxy.on('connection',client=>{
  const upstream=new WebSocket('ws://127.0.0.1:'+relay.http.address().port),pending=[];
  client.on('message',data=>{if(upstream.readyState===WebSocket.OPEN)upstream.send(data.toString());else pending.push(data.toString());});
  upstream.on('open',()=>pending.forEach(data=>upstream.send(data)));
  let queue=Promise.resolve(),delayed=false;
  upstream.on('message',data=>{queue=queue.then(async()=>{
    if(!delayed&&JSON.parse(data.toString()).type==='world'){delayed=true;await new Promise(resolve=>setTimeout(resolve,1800));}
    if(client.readyState===WebSocket.OPEN)client.send(data.toString());
  });});
  client.on('close',()=>upstream.close());upstream.on('close',()=>client.close());
  upstream.on('error',()=>client.close());
});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];fs.mkdirSync('browser-checks/shared-ui',{recursive:true});
try{
  for(const shared of process.argv.includes('--shared-only')?[true]:[false,true])for(const touch of [false,true]){
    const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800}});
    // Existing automation skips onboarding; this test explicitly exercises the real-user path.
    await context.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
    const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
    const url=(process.env.WORLD_TEST_URL||'http://127.0.0.1:5194/')+'?touch='+Number(touch)+'&relay='+encodeURIComponent('ws://127.0.0.1:'+proxy.address().port);
    await page.goto(url);await page.getByLabel('あなたの名前').waitFor();
    await page.getByRole('button',{name:shared?'みんなのワールドで遊ぶ':'ひとりで遊ぶ',exact:false}).click();
    const dialog=page.getByRole('dialog',{name:'あなたの見た目をつくる'});
    await dialog.waitFor();
    await dialog.getByRole('button',{name:'女性',exact:true}).click();
    if(shared)await waitForCondition(page,async()=>!!(await import('/src/session/saves.ts')).savedBundle().wallet);
    else await page.waitForTimeout(2000);
    assert.ok(await dialog.isVisible(),'initialization must not dismiss appearance creation');
    assert.equal(await dialog.getByRole('button',{name:'女性',exact:true}).getAttribute('aria-pressed'),'true','draft must survive initialization');
    await page.screenshot({path:'browser-checks/shared-ui/appearance-'+(shared?'shared':'solo')+'-'+(touch?'phone':'pc')+'.png'});
    // Hold completion callbacks so confirming cannot close before the queued durable save finishes.
    await page.evaluate(()=>{
      const complete=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
      Object.defineProperty(IDBTransaction.prototype,'oncomplete',{...complete,set(handler){
        complete.set.call(this,this.mode==='readwrite'&&handler?function(event){setTimeout(()=>handler.call(this,event),500);}:handler);
      }});
    });
    await dialog.getByRole('button',{name:'この見た目ではじめる',exact:true}).click();
    assert.ok(await dialog.isVisible(),'creation stays visible until saving completes');
    assert.ok(await dialog.getByRole('button',{name:'保存中…',exact:true}).isDisabled());
    await dialog.waitFor({state:'hidden'});
    assert.equal(await page.evaluate(async()=>(await (await import('/src/session/database.ts')).readSave()).appearance.created),true);
    const looks=await page.evaluate(()=>JSON.parse(localStorage.getItem('open-world:looks:v1')));
    assert.equal(looks.sex,'f');assert.equal(looks.hair,'bob');
    await page.reload();await page.getByLabel('あなたの名前').waitFor();
    await page.getByRole('button',{name:shared?'みんなのワールドで遊ぶ':'ひとりで遊ぶ',exact:false}).click();
    if(shared)await waitForCondition(page,async()=>!!(await import('/src/session/saves.ts')).savedBundle().wallet);
    await page.locator('.app').waitFor();
    assert.equal(await dialog.count(),0,'completed creation must not reopen');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('open-world:looks:v1'))),looks);
    // Normal appearance editing still works after first-time setup.
    await page.evaluate(async()=>(await import('/src/state/store.ts')).useGame.getState().setOverlay('looks-edit'));
    await page.getByRole('dialog',{name:'見た目を変える'}).waitFor();
    await context.close();
    console.log('appearance creation / delayed snapshot / draft / confirm / resume / edit passed', {shared,touch});
  }
  assert.deepEqual(errors,[]);
}finally{
  await browser.close();for(const client of proxy.clients)client.terminate();proxy.close();relay.close();
}
