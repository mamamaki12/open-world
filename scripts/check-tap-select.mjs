// 選択ツール: タップ/クリックで1ブロックだけ選択、長押しでその1ブロックだけ削除（PC・スマホ）。npx vite --port 5173 を起動してから実行
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const out=process.argv[2]||'tap-select-checks';import('node:fs').then(f=>f.mkdirSync(out,{recursive:true}));
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
async function run(touch){
 const page=await browser.newPage({viewport:touch?{width:844,height:390}:{width:1280,height:720},deviceScaleFactor:1,hasTouch:touch,isMobile:touch});page.setDefaultTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:5173/?play=1&touch=${touch?1:0}`);await page.waitForFunction(()=>window.__ow?.scene);
 await page.evaluate(async()=>{const {useGame}=await import('/src/state/store.ts');const g=useGame.getState();g.setMode('build');g.setTool('select');g.setOverlay?.(null);
  const h=g.house;g.replaceHouse({...h,walls:[...h.walls.filter(w=>!w.id.startsWith('tw')),
   {id:'tw1',level:0,x0:0,z0:0,x1:4,z1:0,exterior:h.walls[0]?.exterior??'siding-white',interior:h.walls[0]?.interior??'cloth-white',height:'full'},
   {id:'tw2',level:0,x0:0,z0:2,x1:4,z1:2,exterior:h.walls[0]?.exterior??'siding-white',interior:h.walls[0]?.interior??'cloth-white',height:'full'}]});});
 await page.waitForTimeout(3000);
 const pt=await page.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const s=_roots.get(document.querySelector('canvas')).store.getState();
  s.camera.position.set(2,6,-8);s.controls?.target.set(2,1,0);s.controls?.update();s.camera.updateMatrixWorld();s.scene.updateMatrixWorld(true);
  let m=null;s.scene.traverse(o=>{if(!m&&o.isMesh&&o.userData?.partRef?.id==='tw1')m=o;});
  const THREE=await import('/node_modules/.vite/deps/three.js');const box=new THREE.Box3().setFromObject(m);const c=box.getCenter(new THREE.Vector3());c.project(s.camera);
  const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+(c.x+1)/2*r.width,y:r.top+(1-c.y)/2*r.height,found:!!m};});
 assert.ok(pt.found,'wall mesh');await page.waitForTimeout(1500);
 const state=()=>page.evaluate(async()=>{const {useGame}=await import('/src/state/store.ts');const {materialGroup}=await import('/src/building/groups.ts');const g=useGame.getState();return {sel:g.selection?.id??null,group:g.selection?materialGroup(g.house,g.selection,g.groupSelection).length:0,walls:g.house.walls.filter(w=>w.id.startsWith('tw')).map(w=>w.id)};});
 const cdp=touch?await page.context().newCDPSession(page):null;
 const press=async ms=>{if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pt.x,y:pt.y}]});await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.waitForTimeout(ms);await page.mouse.up();}await page.waitForTimeout(1200);};
 if(touch){await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(1200);}else await press(80);const a=await state();console.log(touch?'phone':'pc','tap',a);assert.equal(a.sel,'tw1');assert.equal(a.group,1);
 await page.screenshot({path:`${out}/${touch?'phone':'pc'}-selected.png`});
 await press(1500);const b=await state();console.log(touch?'phone':'pc','long',b);assert.deepEqual(b.walls,['tw2']);assert.equal(b.sel,null);
 await page.screenshot({path:`${out}/${touch?'phone':'pc'}-deleted.png`});
 assert.deepEqual(errors,[]);await page.close();
}
await run(false);await run(true);await browser.close();console.log('OK');
