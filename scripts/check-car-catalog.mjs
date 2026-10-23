import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/',out='browser-checks/car-catalog';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const s of [{name:'pc',width:1280,height:800},{name:'phone',width:390,height:844,touch:true},{name:'small',width:320,height:568,touch:true},{name:'landscape',width:844,height:390,touch:true},{name:'pc-200',width:640,height:360},{name:'phone-150',width:260,height:563,touch:true}].filter(s=>!process.env.CATALOG_SIZES||process.env.CATALOG_SIZES.split(',').includes(s.name))){
 const context=await browser.newContext({viewport:{width:s.width,height:s.height},hasTouch:!!s.touch,isMobile:!!s.touch}),page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 const shot=label=>page.screenshot({path:`${out}/${s.name}-${label}.png`,animations:'disabled'});
 const fits=async()=>{const bad=await page.locator('.catalog-modal').evaluate(root=>{const b=root.getBoundingClientRect();return {width:root.scrollWidth,client:root.clientWidth,x:b.x,right:b.right,bottom:b.bottom,top:b.top,body:[root.querySelector('.modal-body').scrollWidth,root.querySelector('.modal-body').clientWidth]};});assert.ok(bad.width<=bad.client+1&&bad.body[0]<=bad.body[1]+1&&bad.x>=-1&&bad.right<=s.width+1&&bad.top>=-1&&bad.bottom<=s.height+1,JSON.stringify(bad));};
 try{
  await page.goto(base+'?play=1&touch='+Number(!!s.touch));await page.waitForFunction(()=>window.__ow);
  await page.evaluate(()=>{window.__ow.economy.setState({money:30000000,tick:()=>{}});window.__ow.game.getState().setOverlay('dealer');});
  await page.locator('.catalog-grid .cat-card').first().waitFor();assert.equal(await page.locator('.cat-card').count(),10);assert.equal(await page.locator('.catalog-modal canvas').count(),0);
  await page.locator('.cat-card img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));await page.waitForFunction(()=>[...document.querySelectorAll('.cat-card img')].every(i=>i.complete&&i.naturalWidth>0));await fits();await shot('lineup');
  if(!await page.locator('.catalog-filter-panel').evaluate(e=>e.open))await page.getByText('絞り込み・並び替え',{exact:false}).first().click();await page.getByLabel('ボディタイプ',{exact:true}).selectOption('スポーツ');assert.equal(await page.locator('.cat-card').count(),2);
  await page.getByLabel('車名・キーワード',{exact:true}).fill('存在しない車');await page.getByText('条件に合う車がありません',{exact:true}).waitFor();await shot('empty');
  await page.getByRole('button',{name:'すべての車を見る',exact:true}).click();assert.equal(await page.locator('.cat-card').count(),10);
  await page.getByLabel('並び順',{exact:true}).selectOption('high');assert.match(await page.locator('.cat-card').first().innerText(),/RAVEN GT/);
  await page.evaluate(()=>window.__ow.economy.setState({money:1000000}));await page.getByLabel('予算内の車だけ',{exact:true}).check();assert.equal(await page.locator('.cat-card').count(),1);
  await page.getByRole('button',{name:'条件をリセット',exact:true}).click();await page.evaluate(()=>window.__ow.economy.setState({money:30000000}));
  await page.locator('#catalog-volt').click();await page.getByRole('heading',{name:'VOLT S',exact:true}).waitFor();await page.getByText('km/kWh',{exact:true}).waitFor();
  await page.getByRole('button',{name:'カラー レッド',exact:true}).click();assert.equal(await page.getByRole('button',{name:'カラー レッド',exact:true}).getAttribute('aria-pressed'),'true');await fits();await page.locator('.modal-body').evaluate(e=>e.scrollTo({top:0}));await shot('detail');
  await page.getByRole('button',{name:'この車を購入する',exact:true}).click();await page.getByRole('group',{name:'購入確認',exact:true}).waitFor();await fits();await shot('confirm');
  await page.getByRole('button',{name:'戻る',exact:true}).click();await page.getByRole('button',{name:'← 車種一覧に戻る',exact:true}).click();assert.equal(await page.locator('#catalog-volt').evaluate(e=>e===document.activeElement),true);
  await page.locator('#catalog-lounge').click();await page.getByRole('heading',{name:'LOUNGE 7',exact:true}).waitFor();await page.getByText('7 名',{exact:true}).waitFor();await fits();
  if(s.name==='pc'){
   const canvas=page.locator('.cat-stage canvas');const before=await canvas.screenshot();const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-140,box.y+box.height/2,{steps:8});await page.mouse.up();const after=await canvas.screenshot();assert.equal(before.equals(after),false,'drag must rotate the demand-rendered preview');
   await page.getByRole('button',{name:'この車を購入する',exact:true}).click();await page.evaluate(()=>window.__ow.economy.setState({money:0}));assert.equal(await page.getByRole('button',{name:'購入を確定する',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'戻る',exact:true}).click();assert.equal(await page.getByRole('button',{name:'所持金が足りません',exact:true}).isDisabled(),true);
   await page.evaluate(()=>window.__ow.economy.setState({money:30000000}));await page.getByRole('button',{name:'この車を購入する',exact:true}).click();await page.getByRole('button',{name:'購入を確定する',exact:true}).click();await page.getByRole('alert').filter({hasText:'カーディーラーの入口から購入してください'}).waitFor();
   await page.evaluate(async()=>{const {civicOffset}=await import('/src/state/economy.ts'),{DEALER}=await import('/src/building/dealer.ts');const o=civicOffset();window.__ow.game.getState().setMode('walk');Object.assign(window.__ow.player,{x:o.x+(DEALER.x0+DEALER.x1)/2,z:o.z+DEALER.z0-1,y:0});});
   await page.getByRole('button',{name:'購入を確定する',exact:true}).click();await page.locator('.catalog-modal').waitFor({state:'detached'});
   const saved=await page.evaluate(async()=>({cars:(await import('/src/state/vehicles.ts')).useVehicles.getState().cars,money:window.__ow.economy.getState().money,saved:JSON.parse(localStorage.getItem('open-world:cars:v1'))}));assert.equal(saved.cars.length,1);assert.equal(saved.cars[0].model,'lounge');assert.equal(saved.cars[0].color,'#b52734');assert.equal(saved.money,25820000);assert.equal(saved.saved[0].model,'lounge');
   await page.evaluate(async()=>{const {useVehicles}=await import('/src/state/vehicles.ts');const car=useVehicles.getState().cars[0];useVehicles.setState({cars:Array.from({length:10},(_,i)=>({...car,id:'capacity-'+i}))});window.__ow.game.getState().setOverlay('dealer');});
   await page.locator('#catalog-moco').click();assert.equal(await page.getByRole('button',{name:'所有できる車は10台までです',exact:true}).isDisabled(),true);
   await page.getByRole('button',{name:'閉じる',exact:true}).click();
   await page.evaluate(async()=>{const {useVenue}=await import('/src/state/venue.ts');useVenue.setState({model:'raven',dealerIntent:'specs'});window.__ow.game.getState().setOverlay('dealer');});await page.getByRole('heading',{name:'RAVEN GT',exact:true}).waitFor();assert.equal(await page.getByRole('group',{name:'購入確認',exact:true}).count(),0);await page.getByRole('button',{name:'閉じる',exact:true}).click();
   await page.evaluate(async()=>{const {useVenue}=await import('/src/state/venue.ts');useVenue.setState({model:'breeze',dealerIntent:'buy'});window.__ow.game.getState().setOverlay('dealer');});await page.getByRole('heading',{name:'BREEZE RS',exact:true}).waitFor();await page.getByRole('group',{name:'購入確認',exact:true}).waitFor();
  }
  assert.deepEqual(errors,[]);results.push({size:s.name,filters:true,images:true,detail:true,color:true,confirm:true,noOverflow:true,errors});console.log(s.name+' catalog passed');
 }catch(e){await shot('failure');throw e;}finally{await context.close();}
}}finally{await browser.close();fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
