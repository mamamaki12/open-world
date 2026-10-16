import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const out=process.argv[2]||'building-detail-checks';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
async function open(touch=false,full=false){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1,hasTouch:touch});page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let seed=12345;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);});
 await page.goto(`http://127.0.0.1:5173/?play=1&touch=${touch?1:0}${full?'&buildingDetail=full':''}`);await page.waitForFunction(()=>window.__ow?.scene?.getObjectByName('town-houses')?.userData.baking===false);return page;
}
async function view(page,position=[80,75,140],target=[-30,5,12]){
 const frame=await page.evaluate(async({position,target})=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const s=_roots.get(document.querySelector('canvas')).store.getState();s.camera.position.set(...position);s.controls.target.set(...target);s.controls.update();window.__buildingTestState=s;return s.gl.info.render.frame;},{position,target});await page.waitForTimeout(1500);
 await page.waitForFunction(frame=>window.__buildingTestState.gl.info.render.frame>=frame+6,frame);
 return page.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const s=_roots.get(document.querySelector('canvas')).store.getState();s.scene.updateMatrixWorld(true);s.gl.info.reset();s.gl.render(s.scene,s.camera);const tiers={near:0,exterior:0,distant:0};s.scene.traverse(o=>{if(o.userData.buildingDetail)tiers[o.userData.buildingDetail]++;});return {calls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,tiers,dpr:s.gl.getPixelRatio(),shadow:s.gl.shadowMap.type};});
}
const baseline=await open(false,true),before=await view(baseline);await baseline.screenshot({path:out+'/pc-before.png'});await baseline.close();
const pc=await open(),after=await view(pc);await pc.screenshot({path:out+'/pc-after.png'});
console.log('overview',JSON.stringify({before,after}));
assert.ok(after.triangles<before.triangles*.7,'overview meaningfully reduces triangles');assert.ok(after.calls<before.calls,'overview reduces draw calls');assert.equal(after.dpr,before.dpr);assert.equal(after.shadow,before.shadow);assert.ok(after.tiers.distant>0);
// Approaching restores room details; visiting forces full detail even from a distant camera.
const plot=await pc.evaluate(async()=>Number(Object.keys((await import('/src/building/townHouses.ts')).TOWN_HOUSE_PLOTS)[0]));
const at=await pc.evaluate(async plot=>{const {plotOffset,plotOffsetZ}=await import('/src/state/economy.ts');return {x:plotOffset(plot),z:plotOffsetZ(plot)};},plot);
await view(pc,[at.x+10,5,at.z-12],[at.x+10,3,at.z+8]);
await pc.waitForFunction(p=>window.__ow.scene.getObjectByName('town-house-'+p).userData.buildingDetail==='near',plot);
assert.equal(await pc.evaluate(p=>window.__ow.scene.getObjectByName('town-house-'+p).userData.buildingDetail,plot),'near');
await pc.screenshot({path:out+'/pc-near.png'});
await pc.evaluate(async plot=>(await import('/src/world/visit.ts')).useVisit.setState({plot}),plot);await view(pc);
assert.equal(await pc.evaluate(p=>window.__ow.scene.getObjectByName('town-house-'+p).userData.buildingDetail,plot),'near');
await pc.evaluate(async()=>(await import('/src/world/visit.ts')).useVisit.setState({plot:null}));
// Store interiors are absent at distance and present before entering their doorway.
const shop=await pc.evaluate(async()=>{const {VENUES}=await import('/src/building/venues.ts'),{civicOffset}=await import('/src/state/economy.ts');return {bounds:VENUES.maison,offset:civicOffset()};});
await view(pc,[shop.offset.x+shop.bounds.x0+5,2,shop.offset.z+shop.bounds.z0-8],[shop.offset.x+shop.bounds.x0+5,2,shop.offset.z+shop.bounds.z0+3]);
console.log('store approach',await pc.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const s=_roots.get(document.querySelector('canvas')).store.getState(),g=s.scene.getObjectByName('interior-maison');return {camera:s.camera.position.toArray(),target:s.controls.target.toArray(),store:g.userData,matrix:g.matrixWorld.elements,parent:g.parent.position.toArray(),children:g.children.length};}));
await pc.waitForFunction(()=>window.__ow.scene.getObjectByName('interior-maison').children.length>0,{},{timeout:60000});await pc.screenshot({path:out+'/pc-store-near.png'});
await view(pc,[400,75,400],[0,0,0]);assert.equal(await pc.evaluate(()=>window.__ow.scene.getObjectByName('interior-maison').children.length),0);
await pc.evaluate(async()=>(await import('/src/state/venue.ts')).useVenue.setState({inside:'maison'}));await pc.waitForTimeout(1000);assert.ok(await pc.evaluate(()=>window.__ow.scene.getObjectByName('interior-maison').children.length>0));
await pc.close();
const mobile=await open(true),phone=await view(mobile);assert.equal(phone.tiers.exterior,0);assert.equal(phone.tiers.distant,0);assert.equal(phone.triangles,before.triangles,'mobile keeps the full building meshes');await mobile.close();
fs.writeFileSync(out+'/metrics.json',JSON.stringify({before,after,mobile:phone},null,2));console.log(JSON.stringify({before,after,mobile:phone}));assert.deepEqual(errors,[]);await browser.close();
