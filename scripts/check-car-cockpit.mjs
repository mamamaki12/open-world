// 運転席視点（内装）と町に置いた車のスクリーンショット
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=process.argv[2]??'browser-checks',model=process.argv[3]??'aria';
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});page.setDefaultTimeout(90000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/?play=1');await page.waitForFunction(()=>window.__ow);
await page.evaluate(async(model)=>{const {buyCar,useVehicles}=await import('/src/state/vehicles.ts');window.__ow.economy.setState({money:30000000});useVehicles.setState({cars:[]});buyCar(model,'#204f7b',true);
  window.__ow.game.getState().setOverlay(null);window.__ow.game.getState().setMode('walk');
  const c=useVehicles.getState().cars[0];Object.assign(window.__ow.player,{x:c.x+3.2,z:c.z+2.2,y:0,yaw:Math.atan2(3.2,2.2),bodyYaw:Math.atan2(3.2,2.2),pitch:-.2});},model);
await page.waitForTimeout(2500);await page.screenshot({path:`${out}/town-${model}.png`});
await page.evaluate(async()=>{const {useVehicles}=await import('/src/state/vehicles.ts');const s=useVehicles.getState();useVehicles.setState({driving:s.cars[0].id});});
await page.waitForTimeout(800);await page.evaluate(async()=>{const {useVehicles}=await import('/src/state/vehicles.ts');window.__ow.game.setState({view:'first'});Object.assign(window.__ow.player,{yaw:useVehicles.getState().cars[0].yaw,pitch:-.5});});await page.waitForTimeout(500);
await page.keyboard.down('KeyW');await page.waitForTimeout(900);await page.keyboard.up('KeyW');
await page.waitForTimeout(300);await page.screenshot({path:`${out}/cockpit-${model}.png`});
console.log('errors',errors.slice(0,3));await browser.close();
