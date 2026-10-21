import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { waitForCondition } from './wait-condition.mjs';

const out='browser-checks/build-controls';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try {
  for(const profile of [{name:'pc',width:1280,height:800,touch:false},{name:'phone',width:390,height:844,touch:true},{name:'small-phone',width:320,height:568,touch:true}]) {
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.touch,isMobile:profile.touch});
    const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const cdp=profile.touch?await context.newCDPSession(page):null;
    const state=()=>page.evaluate(()=>{const g=window.__ow.game.getState();return {camera:window.__ow.camera.position.toArray(),selection:g.selection,marked:g.marked,floors:g.house.floors,mode:g.mode};});
    const project=(x,y,z)=>page.evaluate(p=>window.__ow.project(...p),[x,y,z]);
    const drag=async(a,b,hold=0)=>{
      if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});if(hold)await page.waitForTimeout(hold);for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/6,y:a.y+(b.y-a.y)*i/6}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
      else{await page.mouse.move(a.x,a.y);await page.mouse.down();if(hold)await page.waitForTimeout(hold);await page.mouse.move(b.x,b.y,{steps:6});await page.mouse.up();}
      await page.waitForTimeout(300);
    };
    const frame=async()=>{await page.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const s=_roots.get(document.querySelector('canvas')).store.getState();s.controls.target.set(10,0,8);s.camera.position.set(10,24,8.001);s.controls.update();s.camera.updateMatrixWorld();s.scene.updateMatrixWorld(true);});await page.waitForTimeout(700);};
    const undo=async()=>{if(profile.touch)await page.getByRole('button',{name:'取り消し',exact:true}).click();else await page.getByTitle('Ctrl+Z',{exact:true}).click();await page.waitForTimeout(300);};
    try {
      await page.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/')+'?play=1&touch='+Number(profile.touch));await page.waitForFunction(()=>window.__ow?.scene);
      await page.evaluate(async()=>{const {emptyHouse}=await import('/src/building/types.ts');const g=window.__ow.game.getState();g.setMode('build');g.setOverlay(null);g.setTool('select');const finish={material:'flooring',color:'#c8a57a'};window.__ow.game.setState({house:{...emptyHouse(),floors:[{id:'a',level:0,x0:8,x1:10,z0:7,z1:9,finish},{id:'b',level:0,x0:12,x1:14,z0:7,z1:9,finish},{id:'outside',level:0,x0:17,x1:19,z0:14,z1:16,finish}]},past:[],future:[],selection:null,marked:[]});});
      await frame();
      assert.equal(await page.getByRole('button',{name:'選択',exact:true}).count(),0);
      assert.equal(await page.getByRole('button',{name:'範囲選択',exact:true}).count(),0);
      const a=await project(8.5*.91,.5,7.5*.91);
      await drag(a,a,750);assert.equal((await state()).selection,null);assert.equal((await state()).floors.length,3,'holding a floor must not delete it');
      const before=await state();await drag(a,{x:a.x+55,y:a.y-60});const after=await state();
      assert(Math.hypot(...after.camera.map((v,i)=>v-before.camera[i]))>.1,'bare drag must move the view');
      assert.deepEqual(after.floors,before.floors);assert.deepEqual(after.marked,[]);assert.equal(after.selection,null);
      console.log(profile.name,'no selection / no long-press delete / bare drag rotates passed');
      if(profile.touch){await page.getByRole('button',{name:'建築メニューを開く',exact:true}).click();assert.equal(await page.locator('[data-tool="select"]').count(),0);await page.locator('[data-tool="erase"]').click();}
      else await page.keyboard.press('9');
      await page.getByRole('button',{name:'まとめて選ぶ',exact:true}).click();if(profile.touch)await page.getByRole('button',{name:'決定',exact:true}).click();
      await frame();await drag(await project(7*.91,0,6*.91),await project(15*.91,0,10*.91));
      await waitForCondition(page,()=>window.__ow.game.getState().marked.length===2,undefined,30000);
      await page.getByRole('button',{name:/まとめて削除/}).click();assert.deepEqual((await state()).floors.map(f=>f.id),['outside']);await undo();assert.equal((await state()).floors.length,3);
      await page.screenshot({path:out+'/'+profile.name+'.png'});
      const player=await page.evaluate(()=>{window.__ow.game.getState().setMode('walk');Object.assign(window.__ow.player,{x:70,y:.5,z:-40,yaw:Math.PI/2});return {...window.__ow.player};});await page.waitForTimeout(500);
      if(profile.touch){await page.getByRole('button',{name:'メニュー',exact:true}).click();await page.getByRole('button',{name:/建築に戻る/}).click();}else await page.getByRole('button',{name:/建築に戻る/}).click();
      await waitForCondition(page,()=>window.__ow.game.getState().mode==='build',undefined,30000);
      const camera=(await state()).camera;assert(Math.hypot(camera[0]-player.x,camera[2]-player.z)<20);
      assert.deepEqual(errors,[]);results.push({profile:profile.name,status:'passed'});console.log(profile.name,'erase / undo / nearby build camera passed');
    }catch(e){await page.screenshot({path:out+'/'+profile.name+'-failure.png'}).catch(()=>{});throw e;}finally{await context.close();}
  }
}finally{fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await browser.close();}
