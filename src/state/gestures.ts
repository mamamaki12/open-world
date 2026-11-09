import type { Mode, Tool } from './store';
/** 置く道具（床・壁・屋根・階段・家具・ドア・窓）。持っている間、1本指は画面を回さない（回すのは2本指） */
export function placingTool(tool:Tool){
  return tool==='floor'||tool==='wall'||tool==='roof'||tool==='stair'||tool==='furniture'||tool==='door'||tool==='window';
}
/** 1本指のスワイプを予約するか（画面を回さない）。置き始められる場所（土地の中・ドア窓は壁の上）で触れたときだけ。それ以外は1本指で回す */
export function reservesTouch(tool:Tool,mode:Mode,eraseMulti:boolean,insideLot:boolean,boxSelect=false){
  return insideLot && (placingTool(tool) || (tool==='erase'&&eraseMulti&&mode==='build')||(tool==='select'&&boxSelect&&mode==='build'));
}
/** reserved = 1本指で回さない。placeable = その指で置ける（土地の中・ドア窓などは壁の上で触れた） */
export const touchGesture={reserved:false,placeable:false};
