import type { Mode, Tool } from './store';
/** 範囲指定だけが1本指のスワイプを予約する。タップ式の道具では見回せる。 */
export function reservesTouch(tool:Tool,mode:Mode,eraseMulti:boolean,insideLot:boolean){
  return insideLot && (tool==='floor'||tool==='wall'||tool==='roof'||(tool==='erase'&&eraseMulti&&mode==='build'));
}
export const touchGesture={reserved:false};
