// スマホの建築メニュー：家具は選んだだけでメニューが閉じて決定。床など色を選ぶものは決定ボタンまで閉じない。表札は文字入力のため閉じない
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const out='browser-checks/pick-to-confirm';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/')+'?play=1&touch=1');await page.waitForFunction(()=>window.__ow?.scene);
    await page.evaluate(()=>{const g=window.__ow.game.getState();g.setMode('build');g.setOverlay(null);g.setTool('select');});
    const menu=page.locator('.build-menu');
    const open=async()=>{await page.getByRole('button',{name:'建築メニューを開く',exact:true}).click();await menu.waitFor();};
    // 床：素材を選んでも閉じない
    await open();await page.locator('[data-tool="floor"]').click();
    await page.locator('.build-menu-options button').first().click();await page.waitForTimeout(300);
    assert.equal(await menu.count(),1,'floor options must keep the menu open');
    await page.getByRole('button',{name:'決定',exact:true}).click();await menu.waitFor({state:'detached'});
    // 家具：一覧から選ぶとすぐ閉じて、その家具を持つ
    await open();await page.locator('[data-tool="furniture"]').click();
    const item=page.locator('.build-menu-options .choice-list button.choice').filter({hasNotText:'デザイン'}).nth(3);
    const name=(await item.locator('span').first().innerText()).trim();
    await item.click();await menu.waitFor({state:'detached'});
    const s=await page.evaluate(()=>{const g=window.__ow.game.getState();return {tool:g.tool,type:g.defaults.furnitureType};});
    assert.equal(s.tool,'furniture');
    console.log('picked',name,s.type);
    // 向きを変えるは閉じない
    await open();await page.getByRole('button',{name:/向きを変える/}).click();await page.waitForTimeout(300);
    assert.equal(await menu.count(),1,'rotate must keep the menu open');
    // 表札は文字を入れるので閉じない
    await page.locator('.build-menu-options button.choice',{hasText:'表札'}).first().click();await page.waitForTimeout(300);
    assert.equal(await menu.count(),1,'nameplate must keep the menu open');
    await page.screenshot({path:`${out}/nameplate-open.png`});
    assert.deepEqual(errors,[]);console.log('pick-to-confirm passed');
  }catch(e){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e;}finally{await context.close();}
}finally{await browser.close();}
