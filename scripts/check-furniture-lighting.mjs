import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/';
fs.mkdirSync('browser-checks',{recursive:true});
async function until(page,fn,arg){for(const end=Date.now()+90000;Date.now()<end;await page.waitForTimeout(100))if(await page.evaluate(fn,arg))return;throw Error('Lighting condition timed out: '+fn);}
async function stats(page){return page.evaluate(async()=>{
  const {furnitureLightSources}=await import('/src/world/furnitureLights.ts');
  const own=window.__ow.scene.getObjectByName('house');
  const sources=[...furnitureLightSources.keys()].filter(o=>{for(let p=o;p;p=p.parent)if(p===own)return true;return false;});
  const pool=[];window.__ow.scene.traverse(o=>{if(o.isPointLight&&o.name.startsWith('furniture-light-'))pool.push({intensity:o.intensity,shadows:o.castShadow});});
  return {sources:sources.length,pool,camera:window.__ow.camera.position.toArray(),positions:sources.map(o=>o.getWorldPosition(o.position.clone()).toArray())};
});}
async function run(touch){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},hasTouch:touch,isMobile:touch});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);
  const taps=[]; page.on('console',m=>{if(m.text().startsWith('AIMTEST'))taps.push(m.text());});
  try{
    await page.goto(base+`?play=1&touch=${touch?1:0}&climateAt=1320000`);await page.waitForFunction(()=>!!window.__ow);
    if(touch)await page.evaluate(()=>{for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>{if(e.target.closest?.('.aim-place'))console.log('AIMTEST',type,e.target.closest('.aim-place').disabled);},true);});
    await page.evaluate(async()=>{
      const {emptyHouse}=await import('/src/building/types.ts'),g=window.__ow.game.getState(),h=emptyHouse();
      h.floors=[{id:'lamp-floor',level:0,x0:2,z0:2,x1:12,z1:10,finish:g.defaults.floor}];
      h.walls=[{id:'lamp-wall',level:0,x0:3,z0:4,x1:11,z1:4,exterior:g.defaults.wallExterior,interior:g.defaults.wallInterior}];
      g.replaceHouse(h);g.setTool('furniture');g.setDefaults({furnitureType:'wall-sconce'});
      window.__ow.economy.setState({tick:()=>{}});
    });
    if(!touch){
      for(const name of ['壁付けブラケットライト','壁付け間接バーライト','置き型間接照明','庭の間接ポールライト','フロアライト'])assert.ok(await page.getByRole('button',{name,exact:true}).isVisible());
      await page.getByRole('button',{name:'壁付けブラケットライト',exact:true}).click();
      await page.evaluate(async()=>{
        const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js'),s=_roots.get(document.querySelector('canvas')).store.getState();
        s.camera.position.set(6,4,13);s.controls.target.set(6,1.5,5);s.controls.update();s.camera.updateMatrixWorld();
      });
      await page.waitForTimeout(1000);
      const p=await page.evaluate(()=>window.__ow.project(4.55,2.1,3.64));await page.mouse.move(p.x,p.y);
      await until(page,async()=>{const p=(await import('/src/state/interaction.ts')).useInteraction.getState().preview;return p?.kind==='nameplate'&&p.type==='wall-sconce'&&p.mount.wallId==='lamp-wall';});
      assert.equal((await stats(page)).sources,0,'preview does not register a lamp');
      await page.mouse.click(p.x,p.y);
    }else{
      await page.evaluate(()=>{window.__ow.game.setState({mode:'walk',view:'first'});Object.assign(window.__ow.player,{x:4.55,y:.5,z:6,yaw:0,bodyYaw:0,pitch:0});});
      await page.locator('.aim-place').waitFor();
      await until(page,async()=>{const p=(await import('/src/state/interaction.ts')).useInteraction.getState().preview;return p?.kind==='nameplate'&&p.type==='wall-sconce'&&(await import('/src/state/controls.ts')).useAim.getState().valid;});
      await page.locator('.aim-place').tap();
    }
    await until(page,()=>window.__ow.game.getState().house.furniture.length===1);
    const mounted=await page.evaluate(()=>window.__ow.game.getState().house.furniture[0]);assert.equal(mounted.type,'wall-sconce');assert.equal(mounted.wallMount.side,1);
    await until(page,async()=>{const {furnitureLightSources}=await import('/src/world/furnitureLights.ts');const own=window.__ow.scene.getObjectByName('house');return [...furnitureLightSources.keys()].some(o=>{for(let p=o;p;p=p.parent)if(p===own)return true;return false;});});
    console.log(touch?'phone mounted':'desktop mounted');
    if(!touch){
      await page.getByRole('button',{name:'↑ 5cm',exact:true}).click();
      assert.ok(Math.abs(await page.evaluate(()=>window.__ow.game.getState().house.furniture[0].wallMount.height)-mounted.wallMount.height-.05)<1e-6);
      await page.evaluate(()=>{const g=window.__ow.game.getState();g.select(null);g.setTool('furniture');g.setDefaults({furnitureType:'indirect-floor-light'});});
      await page.waitForTimeout(500);
      const p=await page.evaluate(()=>window.__ow.project(6,.5,7));await page.mouse.click(p.x,p.y);
    }else{
      await page.evaluate(()=>{const g=window.__ow.game.getState();g.setTool('furniture');g.setDefaults({furnitureType:'indirect-floor-light'});Object.assign(window.__ow.player,{x:6,y:.5,z:7,yaw:0,pitch:-.8});});
      await until(page,async()=>{const p=(await import('/src/state/interaction.ts')).useInteraction.getState().preview;const {useAim}=await import('/src/state/controls.ts');return p?.kind==='furniture'&&useAim.getState().valid;});
      await page.locator('.aim-place').tap();
    }
    await until(page,()=>window.__ow.game.getState().house.furniture.length===2);
    await page.evaluate(()=>window.__ow.game.getState().select(null));
    await until(page,()=>{
      let active=0;window.__ow.scene.traverse(o=>{if(o.isPointLight&&o.name.startsWith('furniture-light-')&&o.intensity>0)active++;});
      return active>=2;
    });
    const info=await stats(page);assert.equal(info.sources,2);assert.equal(info.pool.length,touch?3:6);assert.ok(info.pool.filter(p=>p.intensity>0).length>=2);assert.ok(info.pool.every(p=>!p.shadows));
    await page.screenshot({path:`browser-checks/furniture-lighting-${touch?'phone':'desktop'}-night.png`});
    // Saving/restoring must retain both the wall attachment and the floor light.
    await page.evaluate(async()=>{const s=await import('/src/session/saves.ts');await s.persist();window.__lightingBackup=JSON.stringify(s.snapshot());});
    await page.evaluate(async()=>{await (await import('/src/session/saves.ts')).importSave(window.__lightingBackup);});
    assert.equal(await page.evaluate(()=>window.__ow.game.getState().house.furniture[0].wallMount.wallId),'lamp-wall');
    await page.evaluate(()=>{const g=window.__ow.game.getState();g.select({kind:'wall',id:'lamp-wall'});g.deleteSelected();});
    await until(page,()=>window.__ow.game.getState().house.furniture.length===1);
    await page.waitForTimeout(500);assert.equal((await stats(page)).sources,1,'removing wall cleans up its light');
    assert.deepEqual(errors,[]);console.log(touch?'Phone lighting passed':'Desktop lighting passed');
  }catch(e){console.error('Lighting failure',touch,e);console.error(taps);try{console.log('Lighting stats',await stats(page));console.log(await page.evaluate(async()=>({house:window.__ow?.game.getState().house,aim:(await import('/src/state/controls.ts')).useAim.getState(),preview:(await import('/src/state/interaction.ts')).useInteraction.getState().preview})));await page.screenshot({path:`browser-checks/furniture-lighting-${touch?'phone':'desktop'}-failure.png`});}catch{}throw e;}
  finally{await context.close();}
}
try{if(process.env.LIGHTING_TEST_MODE!=='phone')await run(false);if(process.env.LIGHTING_TEST_MODE!=='desktop')await run(true);}finally{await browser.close();}
