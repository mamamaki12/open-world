import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const out=process.argv[2]||'fashion-checks';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
async function open(width,height,shop='daily'){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<900});page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:5173/?touch=${width<900?1:0}`);await page.waitForFunction(()=>window.__ow);
 await page.evaluate(async shop=>{const {useVenue}=await import('/src/state/venue.ts');useVenue.setState({inside:shop,shopTab:'shop'});window.__ow.game.getState().setOverlay('boutique');},shop);
 await page.locator('.garment').first().waitFor();return page;
}
const page=await open(1280,900,'maison');
await page.locator('.garment').filter({hasText:'テーラードジャケット'}).click();
const before=await page.evaluate(async()=>{const {useWardrobe}=await import('/src/state/wardrobe.ts');return {outfit:useWardrobe.getState().outfit,money:window.__ow.economy.getState().money};});
assert.equal(before.outfit.top,'starter-tee','trying does not equip');assert.equal(before.money,20000000,'trying is free');
await page.screenshot({path:out+'/desktop.png'});
await page.getByRole('button',{name:/購入して着る/}).click();
const after=await page.evaluate(async()=>{const {useWardrobe}=await import('/src/state/wardrobe.ts');return {outfit:useWardrobe.getState().outfit,money:window.__ow.economy.getState().money,saved:JSON.parse(localStorage.getItem('open-world:wardrobe:v1'))};});
assert.equal(after.outfit.top,'mv-jacket');assert.equal(after.money,before.money-420000);assert.ok(after.saved.owned.includes('mv-jacket'));
await page.getByRole('button',{name:'クローゼット',exact:true}).click();
await page.locator('.garment').filter({hasText:'いつものTシャツ'}).click();await page.getByRole('button',{name:'この服に着替える',exact:true}).click();
assert.equal(await page.evaluate(async()=>(await import('/src/state/wardrobe.ts')).useWardrobe.getState().outfit.top),'starter-tee');
assert.equal(await page.evaluate(()=>window.__ow.economy.getState().money),after.money,'owned clothing costs nothing');
await page.getByRole('button',{name:'売り場',exact:true}).click();
await page.getByRole('button',{name:'トップス',exact:true}).click();assert.equal(await page.locator('.garment').count(),4);
await page.getByRole('combobox').selectOption('low');
const prices=await page.locator('.garment-price').allTextContents();const numbers=prices.map(s=>Number(s.replace(/[^0-9]/g,'')));assert.deepEqual(numbers,[...numbers].sort((a,b)=>a-b));
await page.evaluate(()=>window.__ow.economy.setState({money:0}));await page.locator('.garment').filter({hasText:'シルク ドレスシャツ'}).click();assert.ok(await page.getByRole('button',{name:'所持金が足りません',exact:true}).isDisabled());
await page.close();
for(const [width,height] of [[390,844],[320,568],[844,390]]){
 const phone=await open(width,height);
 assert.equal(await phone.locator('body').evaluate(el=>el.scrollWidth),width,'page fits viewport');
 if(width<700)assert.ok(!(await phone.locator('.boutique-fitting').isVisible()),'mobile initially shows products');
 await phone.screenshot({path:`${out}/catalog-${width}.png`});
 await phone.locator('.garment').filter({hasText:'スウェット パーカー'}).click();
 await phone.locator('.boutique-primary').scrollIntoViewIfNeeded();await phone.screenshot({path:`${out}/fitting-${width}.png`});
 assert.ok(await phone.locator('.boutique-fitting').isVisible());
 const box=await phone.locator('.boutique-primary').boundingBox();assert.ok(box.width<=width&&box.height>=44);
 await phone.getByRole('button',{name:/購入して着る/}).click();
 const selected=await phone.evaluate(async()=>(await import('/src/state/wardrobe.ts')).useWardrobe.getState().outfit.top);assert.equal(selected,'dw-hoodie');
 // Rotation by pointer input in the real 3D preview.
 await phone.getByRole('button',{name:'3D試着室を開く ＋'}).isVisible().then(async visible=>{if(visible)await phone.getByRole('button',{name:'3D試着室を開く ＋'}).click();});
 await phone.locator('.boutique-preview').scrollIntoViewIfNeeded();const preview=await phone.locator('.boutique-preview').boundingBox();await phone.mouse.move(preview.x+preview.width*.5,preview.y+preview.height*.5);await phone.mouse.down();await phone.mouse.move(preview.x+preview.width*.8,preview.y+preview.height*.5,{steps:8});await phone.mouse.up();
 await phone.screenshot({path:`${out}/rotated-${width}.png`});await phone.close();
}
assert.deepEqual(errors,[]);console.log('Fashion checks passed: purchase, free try-on, wardrobe, sort, category, insufficient funds, 3 mobile viewports.');await browser.close();
