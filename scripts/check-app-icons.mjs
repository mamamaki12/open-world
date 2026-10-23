import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const out='browser-checks/app-icons'; fs.mkdirSync(out,{recursive:true});
const names=[...fs.readFileSync('src/ui/iconPaths.ts','utf8').matchAll(/^  (\w+): '/gm)].map(m=>m[1]);
const base=process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try {
 for(const size of [{width:844,height:390},{width:390,height:844},{width:1280,height:720}]) {
  const context=await browser.newContext({viewport:size,hasTouch:size.width<1000,isMobile:size.width<1000});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
  try {
   await page.goto(base+'?play=1&touch='+(size.width<1000?1:0));
   await page.waitForFunction(()=>window.__ow?.scene);
   await page.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');_roots.get(document.querySelector('canvas')).store.getState().setFrameloop('never');});
   for(const overlay of ['controls','inventory','map','jobs','requests','estate','dealer','tuner','exchange','boutique','closet','looks-edit','salon','shop','arcade','ride','casino']) {
    await page.evaluate(name=>window.__ow.game.getState().setOverlay(name),overlay);
    await page.getByRole('dialog').waitFor();
    const text=await page.getByRole('dialog').innerText();
    assert.equal(/\p{Extended_Pictographic}/u.test(text),false,size.width+' '+overlay+' default emoji');
    assert.ok(await page.getByRole('button',{name:'閉じる',exact:true}).count(),overlay+' keeps the close control');
    if(['inventory','map','casino'].includes(overlay))await page.screenshot({path:out+'/'+size.width+'x'+size.height+'-'+overlay+'.png'});
    results.push({viewport:size,overlay,originalIcons:true});
   }
   if(size.width===844){await page.evaluate(()=>{const g=window.__ow.game.getState();g.setOverlay('inventory');g.setTool('furniture');g.setDefaults({furnitureType:'nameplate'});});const input=page.getByRole('textbox',{name:'表札に表示する文字'});await input.fill('山田 🌻');assert.equal(await input.inputValue(),'山田 🌻');await page.getByText('表示：山田 🌻',{exact:true}).waitFor();results.push({freeInputPreserved:true});}
   assert.deepEqual(errors,[]);
  } catch(e) {await page.screenshot({path:out+'/'+size.width+'-failure.png'}).catch(()=>{});throw e;}
  finally {await context.close();}
 }
 const page=await browser.newPage({viewport:{width:1000,height:1000}});
 await page.goto(base+'?play=1&touch=0');await page.waitForFunction(()=>window.__ow?.scene);
 await page.evaluate(async(names)=>{
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');_roots.get(document.querySelector('canvas')).store.getState().setFrameloop('never');
  const dom=await import('/node_modules/.vite/deps/react-dom_client.js'),react=await import('/node_modules/.vite/deps/react.js'),{AppIcon}=await import('/src/ui/AppIcon.tsx');const createRoot=dom.createRoot??dom.default.createRoot,h=react.createElement??react.default.createElement;
  const host=document.createElement('div');host.id='icon-gallery';host.style.cssText='position:fixed;inset:0;z-index:99999;background:#f5f0dc;color:#29392f;padding:24px;display:grid;grid-template-columns:repeat(8,1fr);gap:12px;align-content:start;font:13px monospace';document.body.append(host);
  createRoot(host).render(h('div',{style:{display:'contents'}},names.map(name=>h('div',{key:name,style:{display:'grid',placeItems:'center',gap:8,padding:12,border:'2px solid #71806a',background:'#e8e8cd'}},h(AppIcon,{name,className:'gallery-icon'}),h('span',null,name)))));
  const style=document.createElement('style');style.textContent='#icon-gallery .app-icon{width:40px;height:40px}';document.head.append(style);
 },names);
 await page.locator('#icon-gallery svg').last().waitFor();
 assert.equal(await page.locator('#icon-gallery svg').count(),names.length);
 await page.screenshot({path:out+'/gallery.png'});
 console.log('Original SVG icons / 17 menus / desktop and phone / accessible close controls passed',names.length);
} finally {fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await browser.close();}

