import { create } from 'zustand';
import { civicOffset } from './economy';
import { useGame } from './store';
import { isDoorOpen, useDoors } from './doors';
import { throughDoorway, venueAt, venueDoorAt, venueDoorId, VENUE_KINDS } from '../building/venues';
import type { Venue, CasinoGame, TunerTab } from '../building/venues';
import { playDoorSound } from '../world/sound';
interface Point {x:number;y:number;z:number}
/** inside はプレイヤーが壁の内側にいる店。入口の扉を開けて歩いて出入りする（別の空間へは移らない）。 */
export const useVenue=create<{inside:Venue|null;game:CasinoGame|null;model:string|null;dealerIntent:'buy'|'specs'|'catalog';tab:TunerTab|null}>(()=>({inside:null,game:null,model:null,dealerIntent:'catalog',tab:null}));
/** 立っている場所から、いまどの店の中にいるかを更新する。 */
export function syncVenue(p:Point){
  const o=civicOffset(),inside=Math.abs(p.y)<1?venueAt(p.x-o.x,p.z-o.z):null;
  if(useVenue.getState().inside!==inside){
    useVenue.setState({inside});
    if(inside)useGame.getState().setTool('select');
  }
}
/** 自動ドア：人が近づくと開き、離れるか店の奥へ入ると閉まる。車で通りかかっても開かない。 */
export function autoVenueDoors(p:Point,walking:boolean){
  const o=civicOffset(),near=walking?venueDoorAt(p.x-o.x,p.z-o.z,p.y):null,doors=useDoors.getState();
  for(const kind of VENUE_KINDS){
    const id=venueDoorId(kind),open=isDoorOpen(id),want=kind===near;
    // 戸口に立っているあいだは閉めない（はさまないように）
    if(open===want||(!want&&throughDoorway(kind,{x:p.x-o.x,z:p.z-o.z})))continue;
    doors.toggle(id,1);playDoorSound(want,true);
  }
}
