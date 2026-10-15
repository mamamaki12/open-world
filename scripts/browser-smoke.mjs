import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('browser-checks',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1100,height:760},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
page.setDefaultTimeout(90000);
try {
  for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:5173');break;}catch{await new Promise(r=>setTimeout(r,250));}}
  await page.goto('http://127.0.0.1:5173');
  await page.waitForFunction(()=>window.__ow);
  const visit=async(kind,action)=>{
    await page.evaluate(async({kind,action})=>{
      const {useVenue,enterVenue}=await import('/src/state/venue.ts');
      const {VENUES,VENUE_ACTIONS}=await import('/src/building/venues.ts');
      const {civicOffset}=await import('/src/state/economy.ts');
      const g=window.__ow;g.game.getState().setOverlay(null);
      useVenue.setState({inside:null,outside:null});g.game.getState().setMode('walk');
      enterVenue(kind,g.player);
      const b=VENUES[kind],o=civicOffset(),a=VENUE_ACTIONS[kind].find(a=>a.id===action);
      Object.assign(g.player,{x:o.x+(b.x0+b.x1)/2+a.x,z:o.z+(b.z0+b.z1)/2+a.z,y:0,yaw:Math.PI,bodyYaw:Math.PI});
    },{kind,action});
    await page.waitForTimeout(600);
  };
  await visit('dealer','moco');
  await page.getByRole('button',{name:'スペックを見る',exact:true}).waitFor();
  await page.screenshot({path:'browser-checks/dealer-interior.png'});
  await page.getByRole('button',{name:'スペックを見る',exact:true}).click();
  await page.getByText('最高速度（街中）',{exact:true}).waitFor();
  await page.getByText('25.2 km/L',{exact:true}).waitFor();
  await page.screenshot({path:'browser-checks/dealer-catalog.png'});
  await page.evaluate(()=>window.__ow.game.getState().setOverlay(null));
  await page.evaluate(()=>window.__ow.economy.setState({money:20000000}));
  await page.keyboard.press('f');
  await page.getByRole('button',{name:'購入を確定する',exact:true}).click();
  const car=await page.evaluate(async()=>{const {useVehicles}=await import('/src/state/vehicles.ts');return useVehicles.getState().cars[0];});
  assert.equal(car.model,'moco');
  assert.equal(await page.evaluate(()=>window.__ow.economy.getState().money),19020000);
  for(const [action,label] of [['slots','スロットで遊ぶ'],['roulette','ルーレットで遊ぶ'],['highlow','ハイ＆ローで遊ぶ'],['horse','競馬で遊ぶ'],['keirin','競輪で遊ぶ'],['boat','ボートレースで遊ぶ']]){
    await visit('casino',action);
    await page.getByRole('button',{name:new RegExp(label)}).waitFor();
    await page.keyboard.press('f');
    await page.getByRole('button',{name:'← ゲーム選択に戻る',exact:true}).waitFor();
    await page.evaluate(()=>window.__ow.game.getState().setOverlay(null));
  }
  await visit('casino','lobby');await page.screenshot({path:'browser-checks/casino-interior.png'});
  await visit('estate','land');
  await page.getByRole('button',{name:/土地を見る/}).waitFor();
  await page.screenshot({path:'browser-checks/estate-interior.png'});
  await page.keyboard.press('f');await page.getByRole('button',{name:'土地を買う',exact:true}).waitFor();
  await page.evaluate(async()=>{
    const {useVenue}=await import('/src/state/venue.ts');const {currentPlotOf}=await import('/src/state/economy.ts');const {plotX,plotZ}=await import('/src/economy/town.ts');
    const g=window.__ow,s=g.economy.getState(),offer=s.offers.find(o=>typeof o.plot==='number'),p=currentPlotOf(s);
    g.game.getState().setOverlay(null);useVenue.setState({inside:null,outside:null});
    Object.assign(g.player,{x:plotX(offer.plot)-plotX(p)-1.1,z:plotZ(offer.plot)-plotZ(p)+18.8,y:0});
  });
  await page.getByRole('button',{name:/この土地を買う/}).waitFor();
  await page.keyboard.press('f');
  await page.getByRole('button',{name:'購入を確定する',exact:true}).waitFor();
  await page.evaluate(async()=>{
    const {useVenue}=await import('/src/state/venue.ts');const {useVehicles}=await import('/src/state/vehicles.ts');const {currentPlotOf}=await import('/src/state/economy.ts');const {plotX,plotZ}=await import('/src/economy/town.ts');
    const g=window.__ow,c=useVehicles.getState().cars[0],p=currentPlotOf(g.economy.getState());
    g.game.getState().setOverlay(null);useVenue.setState({inside:null,outside:null});
    Object.assign(g.player,{x:c.x-plotX(p)-Math.cos(c.yaw)*1.5,z:c.z-plotZ(p)+Math.sin(c.yaw)*1.5,y:0});
  });
  await page.getByRole('button',{name:/に乗る/}).waitFor();await page.keyboard.press('f');
  await page.locator('.drive-speed').waitFor();
  await page.keyboard.down('w');await page.waitForTimeout(600);await page.keyboard.up('w');
  const speed=await page.evaluate(async()=>{const {useVehicles}=await import('/src/state/vehicles.ts');return useVehicles.getState().cars[0].speed;});
  assert.ok(speed>0,'car accelerates');
  await page.keyboard.down('Space');await page.waitForTimeout(800);await page.keyboard.up('Space');
  await page.keyboard.press('f');
  await page.waitForFunction(async()=>{const {useVehicles}=await import('/src/state/vehicles.ts');return useVehicles.getState().driving===null;});
  assert.deepEqual(errors,[],'no browser runtime errors');
  console.log('Browser smoke passed: 3 interiors, 6 booths, specs, purchase, land action, driving and exit.');
} finally { await page.screenshot({path:'browser-checks/final.png'}).catch(()=>{});await browser.close(); }
