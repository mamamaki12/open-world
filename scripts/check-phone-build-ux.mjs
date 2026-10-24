// スマホの建築画面の操作の分かりやすさ：回転ボタンが取り消しと違う絵・上の列が1段・「しまう」で手ぶら・メニューで素材がすぐ見える・なぞる間の寸法表示
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const out='browser-checks/phone-build-ux';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  for(const [name,width,height] of [['portrait',390,844],['landscape',844,390]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:1});
    const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const cdp=await context.newCDPSession(page);
    try{
      await page.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/')+'?play=1&touch=1');await page.waitForFunction(()=>window.__ow?.scene);
      await page.evaluate(()=>{const g=window.__ow.game.getState();g.setMode('build');g.setOverlay(null);g.setTool('select');});
      // 1. カメラの回転ボタンは取り消しと同じ矢印を使わない
      const turnIcon=await page.getByRole('button',{name:'左に回る',exact:true}).locator('svg').getAttribute('data-icon');
      const undoIcon=await page.getByRole('button',{name:'取り消し',exact:true}).locator('svg').getAttribute('data-icon');
      assert.notEqual(turnIcon,undoIcon,'turn button must not look like undo');
      assert.equal(await page.getByRole('button',{name:'道具をしまう',exact:true}).count(),0,'no put-away button while bare-handed');
      // 4. 道具を選ぶと、種類・素材が画面内に見える
      await page.getByRole('button',{name:'建築メニューを開く',exact:true}).click();await page.locator('[data-tool="floor"]').click();
      const options=await page.locator('.build-menu-options').boundingBox();
      assert.ok(options&&options.y+120<height,`${name}: options must be visible without scrolling ${JSON.stringify(options)}`);
      await page.getByRole('button',{name:'決定',exact:true}).click();await page.waitForTimeout(800);
      // 2. 道具を持っても、左上の列は1段
      const menuBox=await page.getByRole('button',{name:'メニュー',exact:true}).boundingBox();
      const redoBox=await page.getByRole('button',{name:'やり直し',exact:true}).boundingBox();
      assert.ok(Math.abs(menuBox.y-redoBox.y)<4,`${name}: undo/redo wrapped ${JSON.stringify({menuBox,redoBox})}`);
      // 5. なぞっている間だけ寸法が出る
      const a=name==='portrait'?{x:60,y:640}:{x:250,y:300},b=name==='portrait'?{x:300,y:740}:{x:420,y:360};
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
      for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8}]});await page.waitForTimeout(60);}
      const measure=page.locator('.drag-measure');await measure.waitFor();
      assert.match(await measure.innerText(),/m × .*m（.*畳）/);
      await page.screenshot({path:`${out}/${name}-drag.png`});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
      assert.equal(await measure.count(),0,'measure hides after release');
      // 3. 「しまう」で手ぶらに戻る
      await page.getByRole('button',{name:'道具をしまう',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.__ow.game.getState().tool),'select');
      assert.deepEqual(errors,[]);console.log(name,'phone build UX passed');
    }catch(e){await page.screenshot({path:`${out}/${name}-failure.png`}).catch(()=>{});throw e;}finally{await context.close();}
  }
}finally{await browser.close();}
