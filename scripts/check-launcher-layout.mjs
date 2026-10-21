import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const out='browser-checks/launcher-layout';fs.mkdirSync(out,{recursive:true});const root=path.resolve('dist');
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const relative=pathname.startsWith('/open-world/')?pathname.slice(12)||'index.html':null;
  const file=relative&&path.resolve(root,relative);if(!file||!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];
try {
  for(const size of [{width:1280,height:720},{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1024,height:480}]){
    const name=size.width+'x'+size.height;const context=await browser.newContext({viewport:size});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try {
      await page.goto('http://127.0.0.1:'+server.address().port+'/open-world/');await page.getByLabel('あなたの名前').waitFor();await page.evaluate(()=>document.fonts.ready);
      const fits=async()=>assert.deepEqual(await page.evaluate(()=>{const main=document.querySelector('.world-launch'),card=document.querySelector('.world-card');const bad=[];
        if(main.scrollWidth>main.clientWidth+1)bad.push('horizontal overflow');if(main.scrollTop===0&&card.getBoundingClientRect().top<main.getBoundingClientRect().top-1)bad.push('unreachable top');
        for(const e of main.querySelectorAll('button,input,summary,h1,.world-choice > span')){if(!e.getClientRects().length)continue;const r=e.getBoundingClientRect();if(r.left<-.5||r.right>innerWidth+.5)bad.push(e.textContent||e.tagName);}
        for(const e of main.querySelectorAll('h1,.world-eyebrow')){const range=document.createRange();range.selectNodeContents(e);const text=range.getBoundingClientRect(),box=e.getBoundingClientRect();if(text.left<box.left-1||text.right>box.right+1)bad.push('clipped heading: '+e.textContent);}
        const buttons=[...main.querySelectorAll('.world-choice')].map(e=>e.getBoundingClientRect());if(buttons[0].bottom>buttons[1].top)bad.push('overlapping play buttons');return bad;
      }),[],name+' controls must fit');
      await fits();await page.screenshot({path:out+'/'+name+'-initial.png'});
      await page.getByLabel('あなたの名前').fill('あいうえおかきくけこさしすせそたちつてとなにぬね');await page.locator('summary').click();await page.getByLabel('オンライン接続先').fill('wss://very-long-online-world-address.example.invalid/room/long-path');await fits();
      await page.getByRole('button',{name:'最新版を確認',exact:true}).scrollIntoViewIfNeeded();await fits();await page.screenshot({path:out+'/'+name+'-settings.png'});
      await page.locator('.world-launch').evaluate(el=>({top:el.scrollTop}));
      assert.deepEqual(errors,[]);results.push({viewport:size,passed:true});console.log('production launcher layout / settings / scrolling passed',name);
    }catch(e){await page.screenshot({path:out+'/'+name+'-failure.png'}).catch(()=>{});throw e;}finally{await context.close();}
  }
}finally{await browser.close();server.close();fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
