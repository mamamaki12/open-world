import { create } from 'zustand';
import { sessionGate } from '../session/gate';
import { civicOffset } from './economy';
import { useGame } from './store';
import { isDoorOpen, useDoors } from './doors';
import { throughDoorway, venueAt, venueDoorAt, venueDoorId, VENUE_KINDS } from '../building/venues';
import type { Venue, CasinoGame, TunerTab } from '../building/venues';
import { playDoorSound } from '../world/sound';
interface Point {x:number;y:number;z:number}
/** inside はプレイヤーが壁の内側にいる店。入口の扉を開けて歩いて出入りする（別の空間へは移らない）。 */
export const useVenue=create<{inside:Venue|null;game:CasinoGame|null;model:string|null;dealerIntent:'buy'|'specs'|'catalog';shopTab:'shop'|'closet';tab:TunerTab|null}>(()=>({inside:null,game:null,model:null,dealerIntent:'catalog',shopTab:'shop',tab:null}));
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
  if (sessionGate.role === 'guest' && !sessionGate.shared) return;
  const visitors=sessionGate.visitors().filter(q=>q.walking!==false&&!q.driving);
  const o=civicOffset(),points=walking?[p,...visitors]:visitors,near=new Set(points.map(q=>venueDoorAt(q.x-o.x,q.z-o.z,q.y))),doors=useDoors.getState();
  // Shared players derive automatic doors from presence; do not echo competing door messages.
  const applying=sessionGate.applying;
  if(sessionGate.shared)sessionGate.applying=true;
  try { for(const kind of VENUE_KINDS){
    const id=venueDoorId(kind),open=isDoorOpen(id),want=near.has(kind);
    // 戸口に立っているあいだは閉めない（はさまないように）
    if(open===want||(!want&&points.some(q=>throughDoorway(kind,{x:q.x-o.x,z:q.z-o.z}))))continue;
    doors.toggle(id,1);playDoorSound(want,true);
  }} finally {sessionGate.applying=applying;}
}
