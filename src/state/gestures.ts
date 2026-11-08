import type { Mode, Tool } from './store';
/** 範囲指定と、置く場所を指でずらす道具（階段・家具）は1本指のスワイプを予約する。 */
export function reservesTouch(tool:Tool,mode:Mode,eraseMulti:boolean,insideLot:boolean,boxSelect=false){
  return insideLot && (tool==='floor'||tool==='wall'||tool==='roof'||tool==='stair'||tool==='furniture'||(tool==='erase'&&eraseMulti&&mode==='build')||(tool==='select'&&boxSelect&&mode==='build'));
}
export const touchGesture={reserved:false};
