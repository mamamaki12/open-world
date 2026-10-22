import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/',out='browser-checks/handheld-ui';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const size of [{name:'pc',width:1280,height:800,touch:false},{name:'phone',width:390,height:844,touch:true},{name:'small',width:320,height:568,touch:true},{name:'landscape',width:844,height:390,touch:true}]){
 const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:size.touch,isMobile:size.touch}),page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 const shot=async label=>{await page.screenshot({path:`${out}/${size.name}-${label}.png`});};
 try{
  await page.goto(base+'?touch='+Number(size.touch));await page.getByLabel('あなたの名前').fill('ポケットタウン');await shot('title');
  assert.equal(await page.locator('.pocket-town').count(),1);
  await page.getByRole('button',{name:/ひとりで遊ぶ/}).click();await page.waitForFunction(()=>!!window.__ow);
  await page.evaluate(()=>window.__ow.economy.setState({tick:()=>{}}));
  assert.equal(await page.locator('canvas').first().evaluate(c=>getComputedStyle(c).filter),'none');
  if(size.touch){await page.getByRole('button',{name:'建築メニューを開く',exact:true}).click();await page.locator('[data-tool="furniture"]').click();}else await page.keyboard.press('Digit8');
  await page.getByRole('button',{name:'丸型シーリングライト',exact:true}).waitFor();await shot('build');
  if(size.touch)await page.getByRole('button',{name:'決定',exact:true}).click();
  await page.evaluate(()=>{const g=window.__ow.game.getState();g.setMode('walk');});await shot('walk');
  for(const overlay of ['controls','map','estate','dealer','exchange','closet']){
    await page.evaluate(o=>window.__ow.game.getState().setOverlay(o),overlay);await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('dialog').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
    await shot(overlay);
    const r=await page.getByRole('dialog').boundingBox();assert.ok(r.x>=-1&&r.y>=-1&&r.x+r.width<=size.width+1&&r.y+r.height<=size.height+1,`${size.name} ${overlay} dialog fits`);
    await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
  }
  await page.evaluate(async()=>{const {useVehicles}=await import('/src/state/vehicles.ts'),{STOCK_MODS}=await import('/src/catalog/carMods.ts');useVehicles.setState({cars:[{id:'ui-car',model:'breeze',color:'#9b4150',x:12.52,z:16.8,yaw:0,speed:0,steer:0,wheelSpin:0,braking:false,lights:true,mods:{...STOCK_MODS}}]});});
  await page.getByRole('button',{name:/運転席に乗る/}).click();await page.locator('.drive-hud').waitFor();await shot('drive');
  await page.getByRole('button',{name:'座席から見る',exact:true}).click();await shot('driver-view');
  assert.deepEqual(errors,[]);results.push({name:size.name,screens:11,canvasFilter:'none',errors});console.log(size.name+' handheld UI passed');
 }catch(e){await shot('failure');throw e;}finally{await context.close();}
}}finally{await browser.close();fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
