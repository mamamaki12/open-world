import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/';
fs.mkdirSync('browser-checks/interior-lighting',{recursive:true});
async function until(page,fn){for(const end=Date.now()+90000;Date.now()<end;await page.waitForTimeout(150))if(await page.evaluate(fn))return;throw Error('Interior lighting timed out');}
async function brightness(page){return page.evaluate(()=>{
  const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
  const w=140,h=140,p=new Uint8Array(w*h*4);gl.readPixels(Math.floor(canvas.width/2-w/2),Math.floor(canvas.height/2-h/2),w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);
  let sum=0;for(let i=0;i<p.length;i+=4)sum+=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];return sum/(w*h);
});}
async function waitBrightness(page,test){for(const end=Date.now()+90000;Date.now()<end;await page.waitForTimeout(200)){const value=await brightness(page);if(test(value))return value;}throw Error('Rendered brightness did not settle');}
const results=[];
try{for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},hasTouch:touch,isMobile:touch}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.setDefaultTimeout(120000);
  try{
    await page.goto(base+`?play=1&touch=${touch?1:0}&climateAt=720000`);await page.waitForFunction(()=>!!window.__ow);
    await page.evaluate(async()=>{
      const {emptyHouse}=await import('/src/building/types.ts'),g=window.__ow.game.getState(),h=emptyHouse(),finish=g.defaults.wallInterior;
      h.floors=[{id:'room',level:0,x0:2,z0:2,x1:10,z1:10,finish:g.defaults.floor}];
      h.walls=[[2,2,10,2],[10,2,10,10],[10,10,2,10],[2,10,2,2]].map(([x0,z0,x1,z1],i)=>({id:'w'+i,level:0,x0,z0,x1,z1,exterior:finish,interior:finish}));
      h.roofs=[{id:'roof',level:0,x0:2,z0:2,x1:10,z1:10,type:'flat',axis:'x',flip:false,pitch:0,overhang:0,finish:g.defaults.roofFinish,gableFinish:finish}];
      g.replaceHouse(h);g.setMode('walk');window.__ow.game.setState({view:'first'});
      Object.assign(window.__ow.player,{x:5.5,y:.5,z:6.8,yaw:0,bodyYaw:0,pitch:0});window.__ow.economy.setState({tick:()=>{}});
    });
    await until(page,async()=>{const {interiorShadeEnabled}=await import('/src/world/interiorShade.ts');return interiorShadeEnabled.value===1;});
    const dark=await waitBrightness(page,n=>n>1&&n<60);
    await page.screenshot({path:`browser-checks/interior-lighting/${touch?'phone':'pc'}-dark.png`});
    if(touch){
      await page.evaluate(()=>{const g=window.__ow.game.getState();g.setDefaults({furnitureType:'ceiling-disc-light'});g.setTool('furniture');window.__ow.player.pitch=-.8;});
      await until(page,async()=>{const {useAim}=await import('/src/state/controls.ts');return useAim.getState().valid;});
      await page.locator('.aim-place').tap();
    }else{
      await page.evaluate(async()=>{const g=window.__ow.game.getState();g.setMode('build');g.setTool('furniture');g.setDefaults({furnitureType:'ceiling-disc-light'});});
      await page.getByRole('button',{name:'丸型シーリングライト',exact:true}).click();
      await page.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js'),s=_roots.get(document.querySelector('canvas')).store.getState();s.camera.position.set(6,12,14);s.controls.target.set(5.5,.5,5.2);s.controls.update();s.camera.updateMatrixWorld();});
      await page.waitForTimeout(500);const p=await page.evaluate(()=>window.__ow.project(5.5,.5,5.2));await page.mouse.click(p.x,p.y);
    }
    await until(page,()=>window.__ow.game.getState().house.furniture.some(f=>f.type==='ceiling-disc-light'));
    await page.evaluate(()=>{const g=window.__ow.game.getState();g.setMode('walk');window.__ow.game.setState({view:'first'});Object.assign(window.__ow.player,{x:5.5,y:.5,z:6.8,yaw:0,bodyYaw:0,pitch:0});});
    await until(page,()=>{let active=0;window.__ow.scene.traverse(o=>{if(o.isPointLight&&o.name.startsWith('furniture-light-')&&o.intensity>0)active++;});return active>0;});
    const lit=await waitBrightness(page,n=>n>dark*1.3+2);
    await page.screenshot({path:`browser-checks/interior-lighting/${touch?'phone':'pc'}-lit.png`});
    assert.ok(lit>dark*1.3+2,`visible illumination: dark=${dark}, lit=${lit}`);
    const sources=await page.evaluate(async()=>{const {furnitureLightSources}=await import('/src/world/furnitureLights.ts');return [...furnitureLightSources.keys()].filter(o=>{for(let p=o;p;p=p.parent)if(p===window.__ow.scene.getObjectByName('house'))return true;return false;}).map(o=>o.getWorldPosition(o.position.clone()).toArray());});
    assert.ok(sources.some(p=>Math.abs(p[1]-3.215)<.03),'source is attached below ceiling');
    await page.evaluate(()=>{const g=window.__ow.game.getState();g.select({kind:'furniture',id:g.house.furniture[0].id});g.deleteSelected();});
    const removed=await waitBrightness(page,n=>n<60);assert.ok(removed<lit*.8,'removing light darkens room');
    assert.deepEqual(errors,[]);results.push({touch,dark,lit,removed,sources,errors});
  }finally{await context.close();}
}}finally{await browser.close();fs.writeFileSync('browser-checks/interior-lighting/results.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
