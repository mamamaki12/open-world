// Regenerate the static lineup images from the game's own car models (Vite must be running).
import fs from 'node:fs';
import {chromium} from 'playwright';
fs.mkdirSync('public/cars',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(120000);
 await page.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/')+'?play=1');await page.waitForFunction(()=>window.__ow);
 const cars=await page.evaluate(async()=>(await import('/src/catalog/cars.ts')).CARS.map(c=>c.id));
 for(const model of cars){
  await page.evaluate(async id=>{const {useVenue}=await import('/src/state/venue.ts');useVenue.setState({model:id,dealerIntent:'specs'});window.__ow.game.getState().setOverlay('dealer');},model);
  await page.locator('.cat-stage canvas').waitFor();
  await page.addStyleTag({content:'.catalog-modal .cat-stage{width:640px!important;height:360px!important;max-height:none!important;aspect-ratio:auto!important}'});
  await page.waitForTimeout(1600);await page.locator('.cat-stage canvas').screenshot({path:`public/cars/${model}.png`});
  await page.getByRole('button',{name:'閉じる',exact:true}).click();console.log(model);
 }
}finally{await browser.close();}
