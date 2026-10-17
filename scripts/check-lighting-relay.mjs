import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
const module=process.env.LIGHTING_RELAY_MODULE?pathToFileURL(process.env.LIGHTING_RELAY_MODULE).href:new URL('../server/dist/relay.mjs',import.meta.url).href;
const {createRelay}=await import(module),relay=createRelay();await relay.ready;
await new Promise(r=>relay.http.listen(0,'127.0.0.1',r));
const ws=new WebSocket('ws://127.0.0.1:'+relay.http.address().port),messages=[];ws.on('message',r=>messages.push(JSON.parse(r)));
async function until(fn){for(const end=Date.now()+15000;Date.now()<end;await new Promise(r=>setTimeout(r,20)))if(fn())return;throw Error('Lighting relay timeout');}
async function command(id,lot,action,delta=[]){ws.send(JSON.stringify({type:'command',command:{id,lot,action,delta,reserved:1000000000}}));await until(()=>messages.some(m=>m.type==='result'&&m.result.id===id));const r=messages.find(m=>m.type==='result'&&m.result.id===id).result;assert.equal(r.ok,true,r.message);}
try{
  await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});ws.send(JSON.stringify({type:'shared',id:'lighting-test',name:'照明テスト'}));
  await until(()=>messages.some(m=>m.type==='account'));
  await command('funds','',{type:'money',delta:100000000,label:'test'});
  await command('land','',{type:'buyLand',offer:relay.world().economy.offers[0].id});
  const lot=relay.world().economy.lots[0],finish={material:'siding',color:'#fff'};
  const wall={id:'lamp-wall',level:0,x0:1,z0:2,x1:6,z1:2,exterior:finish,interior:finish};
  const fixtures=['wall-sconce','wall-light-bar','indirect-floor-light','garden-bollard-light'].map((type,i)=>({id:'light-'+i,type,level:0,x:2+i,z:3,rotation:0,color:'#2c3035',...(i<2?{wallMount:{wallId:wall.id,offset:1+i,height:1.6,side:1}}:{})}));
  const delta=[{kind:'walls',id:wall.id,before:null,after:wall},...fixtures.map(f=>({kind:'furniture',id:f.id,before:null,after:f}))];
  await command('lights',lot.id,undefined,delta);
  const saved=relay.world().economy.lots[0].built;assert.deepEqual(saved.furniture,fixtures);
  await command('lights',lot.id,undefined,delta);assert.equal(relay.world().economy.lots[0].built.furniture.length,4);
  console.log('Relay accepts/persists new lighting types, wall mounts and duplicate receipts');
}finally{ws.close();relay.close();}
