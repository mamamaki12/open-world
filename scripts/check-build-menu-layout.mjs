import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const out='browser-checks/build-menu';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try {
  for(const size of [{width:844,height:390},{width:812,height:375},{width:667,height:375},{width:390,height:844},{width:320,height:568}]){
    const name=size.width+'x'+size.height,context=await browser.newContext({viewport:size,hasTouch:true,isMobile:true});
    const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try {
      await page.goto((process.env.WORLD_TEST_URL||'http://127.0.0.1:5173/')+'?play=1&touch=1');await page.waitForFunction(()=>window.__ow?.scene);
      await page.evaluate(async()=>{const g=window.__ow.game.getState();g.setMode('walk');g.setTool('select');g.setOverlay(null);(await import('/src/session/session.ts')).useSession.setState({role:'guest',shared:true,members:[{id:'ui-check',name:'表示確認',host:false,canBuild:true}]});});
      await page.locator('.world-session-toggle').waitFor({state:'visible'});
      await page.getByRole('button',{name:'建築メニューを開く',exact:true}).click();
      const dialog=page.getByRole('dialog',{name:'建築メニュー',exact:true});await dialog.waitFor();
      await page.locator('.world-session-toggle').waitFor({state:'hidden'});
      const fits=async()=>assert.deepEqual(await dialog.evaluate((el,landscape)=>{
        const errors=[],body=el.querySelector('.build-menu-body'),catalog=el.querySelector('.build-menu-catalog'),options=el.querySelector('.build-menu-options');
        for(const node of [el,body,catalog,options].filter(Boolean))if(node.scrollWidth>node.clientWidth+2)errors.push('horizontal overflow: '+node.className);
        const left=catalog.getBoundingClientRect();
        if(options){const right=options.getBoundingClientRect();if(landscape&&(right.width<240||right.left<left.right||right.right>innerWidth))errors.push('compressed settings column');}
        else {const style=getComputedStyle(body),available=body.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);if(left.width<available-2)errors.push('empty settings column still reserves space');}
        if(el.querySelector('.tool-options > .help'))errors.push('unwanted operation explanation');
        for(const node of el.querySelectorAll('.build-menu-head button,.build-menu-head .build-menu-title')){const r=node.getBoundingClientRect();if(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight)errors.push('header outside viewport');}
        return errors;
      },size.width>size.height),[],name+' menu layout');
      await fits();await page.screenshot({path:out+'/'+name+'-walking-bare.png'});
      await dialog.getByRole('button',{name:'決定',exact:true}).click();await dialog.waitFor({state:'hidden'});
      await page.locator('.world-session-toggle').waitFor({state:'visible'});
      await page.evaluate(()=>{window.__ow.game.getState().setMode('build');window.__ow.game.getState().setTool('select');});
      await page.getByRole('button',{name:'建築メニューを開く',exact:true}).click();await dialog.waitFor();
      await fits();await page.screenshot({path:out+'/'+name+'-bare.png'});
      for(const tool of ['floor','wall','door','window','stair','roof','furniture','erase']){
        await dialog.locator('[data-tool="'+tool+'"]').click();await fits();
        if(tool==='floor'||tool==='furniture')await page.screenshot({path:out+'/'+name+'-'+tool+'.png'});
      }
      const last=dialog.locator('.build-menu-prefabs button').last();await last.scrollIntoViewIfNeeded();await fits();
      const box=await last.boundingBox();assert(box&&box.y>=0&&box.y+box.height<=size.height,'last shop is reachable by scrolling');
      await dialog.getByRole('button',{name:'決定',exact:true}).click();await dialog.waitFor({state:'hidden'});
      assert.deepEqual(errors,[]);results.push({viewport:size,status:'passed',fullWidthBare:true,noHelp:true,playerCountHiddenWhileOpen:true,playerCountRestoredOnClose:true});console.log('build menu / full-width bare catalog / no help / player count hidden and restored / all tools / shops / scrolling passed',name);
    }catch(e){await page.screenshot({path:out+'/'+name+'-failure.png'}).catch(()=>{});throw e;}finally{await context.close();}
  }
}finally{fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await browser.close();}
