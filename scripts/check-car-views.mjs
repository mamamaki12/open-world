// 車の外装・内装を角度を変えて撮る（ディーラーのプレビューをドラッグ）
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=process.argv[2]??'browser-checks',ids=(process.argv[3]??'aria,raven').split(',');
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1.5});page.setDefaultTimeout(90000);
await page.goto('http://127.0.0.1:5173/?play=1');await page.waitForFunction(()=>window.__ow);
await page.evaluate(()=>window.__ow.game.getState().setOverlay('dealer'));await page.waitForTimeout(1500);
for(const id of ids){
  if(await page.locator('.catalog-back').count())await page.locator('.catalog-back').click();
  await page.locator('.cat-card',{hasText:id.toUpperCase()}).first().click();await page.waitForTimeout(1200);
  const box=await page.locator('.cat-stage canvas').boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height/2;
  for(const [i,dx] of [[0,0],[1,-260],[2,-200]].entries?[[0,0],[1,-260],[2,-200]]:[]){
    if(dx){await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+dx,cy,{steps:8});await page.mouse.up();await page.waitForTimeout(600);}
    await page.locator('.cat-stage').screenshot({path:`${out}/view-${id}-${i}.png`});
  }
}
await browser.close();
