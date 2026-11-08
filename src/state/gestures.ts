import type { Mode, Tool } from './store';
/** 置く道具（床・壁・屋根・階段・家具・ドア・窓）。持っている間、1本指は画面を回さない（回すのは2本指） */
export function placingTool(tool:Tool){
  return tool==='floor'||tool==='wall'||tool==='roof'||tool==='stair'||tool==='furniture'||tool==='door'||tool==='window';
}
/** 1本指のスワイプを予約するか（画面を回さない）。置く道具はいつも、範囲で選ぶ削除・選択は土地の中で触れたときだけ */
export function reservesTouch(tool:Tool,mode:Mode,eraseMulti:boolean,insideLot:boolean,boxSelect=false){
  return placingTool(tool) || insideLot && ((tool==='erase'&&eraseMulti&&mode==='build')||(tool==='select'&&boxSelect&&mode==='build'));
}
/** reserved = 1本指で回さない。placeable = その指で置ける（土地の中・ドア窓などは壁の上で触れた） */
export const touchGesture={reserved:false,placeable:false};
