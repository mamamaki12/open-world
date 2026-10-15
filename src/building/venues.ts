import { CASINO, ESTATE } from './landmarks';
import { DEALER } from './dealer';
export type Venue='casino'|'estate'|'dealer';
export const VENUES={
  casino:{...CASINO,name:'GRAND STRIP CASINO',floor:'#b5a487',wall:'#352c30',trim:'#bda065'},
  estate:{...ESTATE,name:'まちの不動産',floor:'#d3c1a0',wall:'#f0eee5',trim:'#397e7c'},
  dealer:{...DEALER,name:'AVENUE MOTORS',floor:'#8797a0',wall:'#dce3e6',trim:'#203e50'},
};
export type CasinoGame='slots'|'roulette'|'highlow'|'horse'|'keirin'|'boat';
export interface VenueAction { id:string; label:string; x:number; z:number; game?:CasinoGame; model?:string }
export const VENUE_ACTIONS:Record<Venue,VenueAction[]>={
  casino:[{id:'slots',label:'スロットで遊ぶ',x:-6,z:-3.2,game:'slots'},{id:'roulette',label:'ルーレットで遊ぶ',x:-6,z:2.6,game:'roulette'},{id:'highlow',label:'ハイ＆ローで遊ぶ',x:6,z:2.6,game:'highlow'},{id:'horse',label:'競馬で遊ぶ',x:4,z:-3.2,game:'horse'},{id:'keirin',label:'競輪で遊ぶ',x:6,z:-3.2,game:'keirin'},{id:'boat',label:'ボートレースで遊ぶ',x:8,z:-3.2,game:'boat'},{id:'lobby',label:'ゲーム一覧を見る',x:0,z:2.7}],
  estate:[{id:'land',label:'土地を見る',x:0,z:.5}],
  dealer:[{id:'catalog',label:'カタログを見る',x:0,z:2.7},{id:'moco',label:'MOCO 660 · これを買う',x:-5.7,z:-2.8,model:'moco'},{id:'ridge',label:'RIDGE AWD · これを買う',x:0,z:-2.8,model:'ridge'},{id:'raven',label:'RAVEN GT · これを買う',x:5.7,z:-2.8,model:'raven'}],
};
/** 店内の家具を上から見た矩形。原点は各店舗の中央。 */
export function venueFixtures(kind:Venue) {
  return kind==='casino'?[
    {x:0,z:4,w:6,d:1.2},{x:-6,z:1,w:3.3,d:2.1},{x:6,z:1,w:3.3,d:2.1},
    ...[-8,-6,-4,4,6,8].map(x=>({x,z:-4.7,w:1.15,d:1.1})),
  ]:kind==='estate'?[
    {x:0,z:1.8,w:3.6,d:.8},{x:-3,z:-.3,w:1.4,d:1.4},{x:3,z:-.3,w:1.4,d:1.4},
  ]:[
    {x:0,z:4,w:4,d:1},{x:-5.7,z:.3,w:2.2,d:4.2},{x:0,z:.3,w:2.5,d:5},{x:5.7,z:.3,w:2.4,d:4.9},
  ];
}
export function venueAction(kind:Venue,x:number,z:number):VenueAction|null {
  const b=VENUES[kind],cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
  if(Math.abs(x-cx)<2&&z<b.z0+2.1)return {id:'exit',label:'外へ出る',x:0,z:-(b.z1-b.z0)/2+1};
  return VENUE_ACTIONS[kind].map(a=>({...a,d:Math.hypot(x-cx-a.x,z-cz-a.z)})).filter(a=>a.d<1.65).sort((a,b)=>a.d-b.d)[0]??null;
}
export function resolveVenue(kind:Venue,p:{x:number;z:number},radius=.25) {
  const b=VENUES[kind],cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
  let x=Math.max(b.x0+.25+radius,Math.min(b.x1-.25-radius,p.x)),z=Math.max(b.z0+.25+radius,Math.min(b.z1-.25-radius,p.z));
  for(const f of venueFixtures(kind)){
    const x0=cx+f.x-f.w/2-radius,x1=cx+f.x+f.w/2+radius,z0=cz+f.z-f.d/2-radius,z1=cz+f.z+f.d/2+radius;
    if(x<=x0||x>=x1||z<=z0||z>=z1)continue;
    const q=[{x:x0,z,d:x-x0},{x:x1,z,d:x1-x},{x,z:z0,d:z-z0},{x,z:z1,d:z1-z}].sort((a,b)=>a.d-b.d)[0];x=q.x;z=q.z;
  }
  return {x,z};
}
