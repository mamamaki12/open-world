import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root=path.resolve('dist'),current=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
const newer={...current,id:'next-release',version:'rnext987',builtAt:new Date(Date.parse(current.builtAt)+60000).toISOString()};
const older={...current,id:'old-release',version:'rold1234',builtAt:new Date(Date.parse(current.builtAt)-60000).toISOString()};
let mode='current';
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith('/open-world/')){res.writeHead(404);res.end();return;}
  const relative=pathname.slice('/open-world/'.length)||'index.html';
  res.setHeader('Cache-Control',relative==='sw.js'?'no-store':'public, max-age=3600');
  if(relative==='version.json'){
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify(mode==='newer'?newer:mode==='older'?older:mode==='invalid'?{}:current));return;
  }
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];fs.mkdirSync('world-session-checks',{recursive:true});
try{
  for(const touch of [false,true]){
    mode='current';
    const context=await browser.newContext({viewport:touch?{width:320,height:568}:{width:1280,height:800},hasTouch:touch});
    const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/open-world/?touch='+Number(touch));
    const panel=page.locator('.app-version');
    await panel.getByText('最新版です',{exact:true}).waitFor();
    assert.ok((await panel.innerText()).includes(current.version),'embedded version must match the generated manifest');
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    const saved=()=>page.evaluate(()=>new Promise((resolve,reject)=>{
      const r=indexedDB.open('open-world:session:v1',1);r.onerror=()=>reject(r.error);
      r.onsuccess=()=>{const db=r.result,q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=()=>reject(q.error);};
    }));
    const before=await saved();
    mode='newer';await panel.getByRole('button',{name:'最新版を確認',exact:true}).click();
    await panel.getByText('新しいWeb版があります',{exact:true}).waitFor();
    assert.ok((await panel.innerText()).includes(newer.version));
    assert.equal(await page.evaluate(async()=>{
      for(const key of await caches.keys())if(await(await caches.open(key)).match(new URL('version.json',document.baseURI),{ignoreSearch:true}))return true;
      return false;
    }),false,'release checks must not be served from the offline cache');
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({path:'world-session-checks/version-update-'+(touch?'phone':'pc')+'.png'});
    mode='invalid';await panel.getByRole('button',{name:'最新版を確認',exact:true}).click();
    await panel.getByText('最新版を確認できません。接続を確認して再確認してください',{exact:true}).waitFor();
    mode='older';await panel.getByRole('button',{name:'最新版を確認',exact:true}).click();
    await panel.getByText('公開情報の反映待ちです。少し後でもう一度確認してください',{exact:true}).waitFor();
    await context.setOffline(true);await panel.getByRole('button',{name:'最新版を確認',exact:true}).click();
    await panel.getByText('オフラインのため最新版を確認できません',{exact:true}).waitFor();
    await page.reload();
    await panel.getByText('オフラインのため最新版を確認できません',{exact:true}).waitFor();
    assert.equal((await saved()).profile.id,before.profile.id);
    await context.setOffline(false);mode='current';
    await panel.getByRole('button',{name:'最新版を確認',exact:true}).click();await panel.getByText('最新版です',{exact:true}).waitFor();
    await page.getByLabel('あなたの名前').fill('版確認');
    await page.getByRole('button',{name:'ひとりで遊ぶ',exact:false}).click();await page.locator('.app').waitFor();
    if(!touch)await page.getByRole('button',{name:'歩いてみる',exact:false}).click();
    await page.getByRole('button',{name:/^セーブ/}).click();
    await panel.getByText('最新版です',{exact:true}).waitFor();
    await panel.scrollIntoViewIfNeeded();
    const bounds=await panel.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=page.viewportSize().width+1,'version controls fit the viewport');
    await page.screenshot({path:'world-session-checks/version-save-'+(touch?'phone':'pc')+'.png'});
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),panel.getByRole('button',{name:'🔄 最新版にする',exact:true}).click()]);
    await page.getByLabel('あなたの名前').waitFor();
    const after=await saved();assert.equal(after.profile.id,before.profile.id);assert.equal(after.profile.name,'版確認');assert.deepEqual(after.home.house,before.home.house);
    await context.close();console.log('Version display / uncached latest / update / invalid / stale / offline / save-preserving refresh passed',touch?'phone':'pc');
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
