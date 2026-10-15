import { create } from 'zustand';
import { civicOffset } from './economy';
import { useGame } from './store';
import { isDoorOpen, useDoors } from './doors';
import { throughDoorway, venueAt, venueDoorId } from '../building/venues';
import type { Venue, CasinoGame } from '../building/venues';
import { playDoorSound } from '../world/sound';
interface Point {x:number;y:number;z:number}
/** inside はプレイヤーが壁の内側にいる店。入口の扉を開けて歩いて出入りする（別の空間へは移らない）。 */
export const useVenue=create<{inside:Venue|null;game:CasinoGame|null;model:string|null;dealerIntent:'buy'|'specs'|'catalog'}>(()=>({inside:null,game:null,model:null,dealerIntent:'catalog'}));
/** 立っている場所から、いまどの店の中にいるかを更新する。 */
export function syncVenue(p:Point){
  const o=civicOffset(),inside=Math.abs(p.y)<1?venueAt(p.x-o.x,p.z-o.z):null;
  if(useVenue.getState().inside!==inside){
    useVenue.setState({inside});
    if(inside)useGame.getState().setTool('select');
  }
}
/** 店の入口の引き戸を開け閉めする。人が戸口に立っているあいだは閉めない。 */
export function toggleVenueDoor(kind:Venue,p:Point){
  const id=venueDoorId(kind),o=civicOffset();
  if(isDoorOpen(id)&&throughDoorway(kind,{x:p.x-o.x,z:p.z-o.z}))return false;
  const opened=useDoors.getState().toggle(id,1);
  playDoorSound(opened,true);
  return true;
}
