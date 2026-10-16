// 車のカタログ（ディーラー画面）と車の外装・内装のスクリーンショット
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=process.argv[2]??'browser-checks';
const errors=[];
for(const [tag,vp,q] of [['pc',{width:1280,height:800},'?play=1'],['phone',{width:390,height:844},'?play=1&touch=1'],['land',{width:844,height:390},'?play=1&touch=1']]){
  const page=await browser.newPage({viewport:vp,deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(90000);
  await page.goto('http://127.0.0.1:5173/'+q);await page.waitForFunction(()=>window.__ow);
  await page.evaluate(()=>{window.__ow.economy.setState({money:30000000});window.__ow.game.getState().setOverlay('dealer');});
  await page.waitForTimeout(2500);await page.screenshot({path:`${out}/catalog-${tag}.png`});
  if(tag==='pc'){
    for(const id of ['raven','lounge','ridge']){await page.locator('.cat-card',{hasText:id.toUpperCase()}).first().click().catch(()=>{});await page.waitForTimeout(1500);await page.locator('.cat-stage').screenshot({path:`${out}/car-${id}.png`});}
  }
  await page.close();
}
console.log('errors',errors.slice(0,5));await browser.close();
