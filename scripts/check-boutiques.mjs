import { chromium } from 'playwright';
const out=process.argv[2]||'browser-checks';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:760},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(90000);
await page.goto('http://127.0.0.1:5173');
await page.waitForFunction(()=>window.__ow);
const place=async(kind,dx,dz,yaw,view='third')=>{
  await page.evaluate(async({kind,dx,dz,yaw,view})=>{
    const {VENUES}=await import('/src/building/venues.ts');const {civicOffset}=await import('/src/state/economy.ts');
    const g=window.__ow;g.game.getState().setOverlay(null);g.game.getState().setMode('walk');
    if(g.game.getState().view!==view)g.game.setState({view});
    const b=VENUES[kind],o=civicOffset();
    Object.assign(g.player,{x:o.x+(b.x0+b.x1)/2+dx,z:o.z+(b.z0+b.z1)/2+dz,y:0,yaw,bodyYaw:yaw,pitch:-.1});
  },{kind,dx,dz,yaw,view});
  await page.waitForTimeout(1500);
};
// 通りから4店を見る
await place('atelier',5,-14,Math.PI);await page.screenshot({path:out+'/street.png'});
await place('maison',0,-8,Math.PI);await page.screenshot({path:out+'/maison-front.png'});
await place('daily',0,-8,Math.PI);await page.screenshot({path:out+'/daily-front.png'});
await place('urban',0,-2.2,Math.PI);await page.screenshot({path:out+'/urban-inside.png'});
await place('maison',0,-1.6,Math.PI);
await page.getByRole('button',{name:/服を見る・買う/}).waitFor();
await page.keyboard.press('f');
await page.getByText('売り場').first().waitFor();
await page.evaluate(()=>window.__ow.economy.setState({money:2000000}));
await page.getByRole('button',{name:/テーラードジャケット/}).click();
await page.waitForTimeout(800);
await page.screenshot({path:out+'/maison-panel.png'});
await page.getByRole('button',{name:/購入して着る/}).click();
await page.waitForTimeout(300);
const w=await page.evaluate(async()=>{const {useWardrobe}=await import('/src/state/wardrobe.ts');return {o:useWardrobe.getState().outfit,m:window.__ow.economy.getState().money,ls:localStorage.getItem('open-world:wardrobe:v1')};});
console.log(JSON.stringify(w));
// 外で自分の姿
await place('maison',0,-8,0);await page.screenshot({path:out+'/me-jacket.png'});
await page.evaluate(()=>window.__ow.game.getState().setOverlay('closet'));await page.waitForTimeout(800);
await page.screenshot({path:out+'/closet.png'});
// スマホ
const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
await phone.goto('http://127.0.0.1:5173/?touch=1');await phone.waitForFunction(()=>window.__ow);
await phone.evaluate(async()=>{const g=window.__ow;g.game.getState().setMode('walk');const {useVenue}=await import('/src/state/venue.ts');useVenue.setState({inside:'daily',shopTab:'shop'});g.game.getState().setOverlay('boutique');});
await phone.waitForTimeout(1200);await phone.screenshot({path:out+'/phone-panel.png'});
console.log('errors',errors);
await browser.close();
