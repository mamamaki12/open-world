import { CASINO, ESTATE } from './landmarks';
import { DEALER } from './dealer';
import { TUNER } from './tuner';
import { EXCHANGE } from './exchange';
import { BOUTIQUES, BOUTIQUE_ACTIONS, BOUTIQUE_DOOR, BOUTIQUE_FIXTURES, BOUTIQUE_IDS, BOUTIQUE_INFO, isBoutique } from './boutiques';
import type { BoutiqueId } from './boutiques';
export type Venue='casino'|'estate'|'dealer'|'tuner'|'exchange'|BoutiqueId;
const boutiqueVenue=(id:BoutiqueId)=>({...BOUTIQUES[id],name:BOUTIQUE_INFO[id].name,floor:BOUTIQUE_INFO[id].floor,wall:BOUTIQUE_INFO[id].wall,trim:BOUTIQUE_INFO[id].trim});
export const VENUES:Record<Venue,{x0:number;x1:number;z0:number;z1:number;name:string;floor:string;wall:string;trim:string}>={
  casino:{...CASINO,name:'GRAND STRIP CASINO',floor:'#b5a487',wall:'#352c30',trim:'#bda065'},
  estate:{...ESTATE,name:'まちの不動産',floor:'#d3c1a0',wall:'#f0eee5',trim:'#397e7c'},
  dealer:{...DEALER,name:'AVENUE MOTORS',floor:'#8797a0',wall:'#dce3e6',trim:'#203e50'},
  tuner:{...TUNER,name:'STANCE GARAGE',floor:'#5d6166',wall:'#2b2e33',trim:'#e0b400'},
  exchange:{...EXCHANGE,name:'まち証券取引所',floor:'#c9c2b4',wall:'#eeebe3',trim:'#1e4d8c'},
  maison:boutiqueVenue('maison'),atelier:boutiqueVenue('atelier'),urban:boutiqueVenue('urban'),daily:boutiqueVenue('daily'),
};
export type CasinoGame='slots'|'roulette'|'highlow'|'horse'|'keirin'|'boat';
export type TunerTab='paint'|'engine'|'wheels'|'chassis'|'aero';
export interface VenueAction { id:string; label:string; x:number; z:number; game?:CasinoGame; model?:string; tab?:TunerTab }
export const VENUE_ACTIONS:Record<Venue,VenueAction[]>={
  casino:[{id:'slots',label:'スロットで遊ぶ',x:-6,z:-3.2,game:'slots'},{id:'roulette',label:'ルーレットで遊ぶ',x:-6,z:2.6,game:'roulette'},{id:'highlow',label:'ハイ＆ローで遊ぶ',x:6,z:2.6,game:'highlow'},{id:'horse',label:'競馬で遊ぶ',x:4,z:-3.2,game:'horse'},{id:'keirin',label:'競輪で遊ぶ',x:6,z:-3.2,game:'keirin'},{id:'boat',label:'ボートレースで遊ぶ',x:8,z:-3.2,game:'boat'},{id:'lobby',label:'ゲーム一覧を見る',x:0,z:2.7}],
  estate:[{id:'land',label:'土地を見る',x:0,z:.5}],
  exchange:[{id:'trade',label:'株を売買する',x:0,z:.6}],
  ...Object.fromEntries(BOUTIQUE_IDS.map(id=>[id,BOUTIQUE_ACTIONS])) as Record<BoutiqueId,VenueAction[]>,
  tuner:[{id:'custom',label:'カスタムの相談をする',x:0,z:3.2,tab:'paint'},{id:'paint',label:'塗装・デザインを選ぶ',x:-5.5,z:3.7,tab:'paint'},{id:'chassis',label:'車高・キャンバーを調整する',x:-2.5,z:.5,tab:'chassis'},
    {id:'wheels',label:'ホイールを選ぶ',x:6.2,z:0,tab:'wheels'},{id:'engine',label:'エンジンを選ぶ',x:4.5,z:-2,tab:'engine'},{id:'aero',label:'リアウィングを選ぶ',x:4.6,z:4.4,tab:'aero'}],
  dealer:[{id:'catalog',label:'カタログを見る',x:0,z:2.7},{id:'moco',label:'MOCO 660 · これを買う',x:-5.7,z:-2.8,model:'moco'},{id:'ridge',label:'RIDGE AWD · これを買う',x:0,z:-2.8,model:'ridge'},{id:'raven',label:'RAVEN GT · これを買う',x:5.7,z:-2.8,model:'raven'}],
};
/** 店内の家具を上から見た矩形。原点は各店舗の中央。 */
export function venueFixtures(kind:Venue) {
  if(isBoutique(kind))return BOUTIQUE_FIXTURES;
  return kind==='casino'?[
    {x:0,z:4,w:6,d:1.2},{x:-6,z:1,w:3.3,d:2.1},{x:6,z:1,w:3.3,d:2.1},
    ...[-8,-6,-4,4,6,8].map(x=>({x,z:-4.7,w:1.15,d:1.1})),
    // 壁ぞいのスロット・ポーカー台・両替所・ラウンジ・植物（src/world/CasinoDecor.tsx）
    {x:-11.3,z:0,w:1.1,d:3.6},{x:9.8,z:0,w:2.6,d:2.6},{x:-10.2,z:5.85,w:3.3,d:1.1},{x:10,z:6.3,w:3,d:.8},{x:10,z:5.3,w:1.2,d:.6},
    {x:-11.2,z:-6.2,w:.5,d:.5},{x:11.2,z:-6.2,w:.5,d:.5},{x:-3,z:-6.3,w:.5,d:.5},{x:3,z:-6.3,w:.5,d:.5},
  ]:kind==='estate'?[
    {x:0,z:1.8,w:3.6,d:.8},{x:-3,z:-.3,w:1.4,d:1.4},{x:3,z:-.3,w:1.4,d:1.4},
    // 待合ソファ・雑誌の台・家の模型・植物（src/world/CasinoDecor.tsx）
    {x:-3.4,z:-3.45,w:1.9,d:.7},{x:-3.4,z:-2.7,w:.9,d:.45},{x:3.4,z:-3.3,w:.9,d:.9},{x:-4.45,z:3.45,w:.45,d:.45},{x:4.45,z:3.45,w:.45,d:.45},
  ]:kind==='exchange'?[
    {x:0,z:1.8,w:4,d:.8},{x:-3.5,z:-1,w:1.4,d:.8},{x:3.5,z:-1,w:1.4,d:.8},
  ]:kind==='tuner'?[
    {x:0,z:4.4,w:4,d:1},{x:-4.5,z:.5,w:2.6,d:5},{x:-5.5,z:5.2,w:2.4,d:.8},{x:7.4,z:0,w:.8,d:6},{x:4.5,z:-3.2,w:1.4,d:1},{x:4.6,z:5.5,w:3.4,d:.6},
  ]:[
    {x:0,z:4,w:4,d:1},{x:-5.7,z:.3,w:2.2,d:4.2},{x:0,z:.3,w:2.5,d:5},{x:5.7,z:.3,w:2.4,d:4.9},
  ];
}
export function venueAction(kind:Venue,x:number,z:number):VenueAction|null {
  const b=VENUES[kind],cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
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

export const VENUE_KINDS:Venue[]=['casino','estate','dealer','tuner','exchange',...BOUTIQUE_IDS];
/** 各店の入口（正面 z0 の壁にある引き戸）。x は中心、width は通れる幅。 */
export const VENUE_DOORS:Record<Venue,{x:number;width:number;height:number}>={
  casino:{x:CASINO.door.x,width:CASINO.door.width,height:CASINO.door.height},
  estate:{x:ESTATE.door.x,width:ESTATE.door.width,height:2.6},
  dealer:{x:(DEALER.x0+DEALER.x1)/2,width:2.2,height:2.6},
  tuner:{x:(TUNER.x0+TUNER.x1)/2,width:2.2,height:2.6},
  exchange:{x:(EXCHANGE.x0+EXCHANGE.x1)/2,width:2.2,height:2.8},
  ...Object.fromEntries(BOUTIQUE_IDS.map(id=>[id,{x:(BOUTIQUES[id].x0+BOUTIQUES[id].x1)/2,...BOUTIQUE_DOOR}])) as Record<BoutiqueId,{x:number;width:number;height:number}>,
};
/** 入口の壁の厚み（z0 から内側へ） */
export const VENUE_WALL=.25;
export const venueDoorId=(kind:Venue)=>'venue:'+kind;
/** 店の壁の内側にいる店 */
export function venueAt(x:number,z:number):Venue|null {
  return VENUE_KINDS.find(k=>{const b=VENUES[k];return x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1;})??null;
}
/** 自動ドアのセンサーが人を感じる範囲：外は扉の前2.4m、中は戸口から1.5mまで（店に入って奥へ進むと閉まる） */
export function venueDoorAt(x:number,z:number,y=0):Venue|null {
  if(Math.abs(y)>=.6)return null;
  return VENUE_KINDS.find(k=>{const d=VENUE_DOORS[k],z0=VENUES[k].z0;return Math.abs(x-d.x)<d.width/2+.6&&z>z0-2.4&&z<z0+VENUE_WALL+1.5;})??null;
}
/** 開いた入口の中（壁の厚みの部分）にいれば、入口の幅に収めた位置を返す。いなければ null */
export function throughDoorway(kind:Venue,p:{x:number;z:number},radius=.25) {
  const d=VENUE_DOORS[kind],z0=VENUES[kind].z0;
  if(p.z<z0-radius-.05||p.z>z0+VENUE_WALL+radius||Math.abs(p.x-d.x)>=d.width/2)return null;
  return {x:Math.max(d.x-d.width/2+radius,Math.min(d.x+d.width/2-radius,p.x)),z:p.z};
}
