// 見た目の作成画面と美容室の確認。スクリーンショットを looks-checks/ に保存する
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const out=process.argv[2]||'looks-checks';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
const page=await browser.newPage({viewport:{width:1280,height:860},deviceScaleFactor:1});page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/?play=1&touch=0');await page.waitForFunction(()=>window.__ow);
await page.evaluate(()=>window.__ow.game.getState().setOverlay('looks'));
await page.locator('.looks-modal').waitFor();
for(const [sex,hair] of [['女性','ロング'],['女性','ポニーテール'],['男性','マッシュ'],['男性','ツーブロック']]){
  await page.getByRole('button',{name:sex,exact:true}).click();await page.getByRole('button',{name:hair,exact:true}).click();
  await page.waitForTimeout(600);await page.locator('.looks-preview').screenshot({path:`${out}/create-${hair}.png`});
}
await page.getByRole('button',{name:/^金髪/}).click();await page.getByRole('button',{name:'この見た目ではじめる'}).click();
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('open-world:looks:v1')));
assert.equal(saved.sex,'m');assert.equal(saved.hair,'twoblock');assert.equal(saved.hairColor,4);
// 美容室：髪型と色を変えるとお金が減る
await page.evaluate(async()=>{const {useVenue}=await import('/src/state/venue.ts');useVenue.setState({inside:'salon'});window.__ow.game.getState().setOverlay('salon');});
await page.waitForTimeout(500);await page.screenshot({path:`${out}/salon-open.png`});
const money=await page.evaluate(()=>window.__ow.economy.getState().money);
await page.getByRole('button',{name:/^ボブ/}).click();await page.getByRole('button',{name:/^ピンク/}).click();
await page.waitForTimeout(600);await page.screenshot({path:`${out}/salon.png`});
await page.getByRole('button',{name:'この髪型にする'}).click();
const after=await page.evaluate(()=>({money:window.__ow.economy.getState().money,looks:JSON.parse(localStorage.getItem('open-world:looks:v1'))}));
assert.equal(after.money,money-6500-9000);assert.equal(after.looks.hair,'bob');assert.equal(after.looks.hairColor,8);
await page.close();
const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true});phone.on('pageerror',e=>errors.push(e.message));
await phone.goto('http://127.0.0.1:5173/?play=1&touch=1');await phone.waitForFunction(()=>window.__ow);
await phone.evaluate(()=>window.__ow.game.getState().setOverlay('looks-edit'));await phone.locator('.looks-modal').waitFor();await phone.waitForTimeout(600);
assert.equal(await phone.locator('body').evaluate(el=>el.scrollWidth),390,'fits phone');
await phone.screenshot({path:`${out}/edit-phone.png`});
await browser.close();
assert.deepEqual(errors,[]);console.log('looks ok');
