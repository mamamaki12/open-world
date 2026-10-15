import { create } from 'zustand';
import { civicOffset } from './economy';
import { useGame } from './store';
import { VENUES } from '../building/venues';
import type { Venue, CasinoGame } from '../building/venues';
interface Point {x:number;y:number;z:number;yaw:number;bodyYaw:number;pitch:number}
export const useVenue=create<{inside:Venue|null;outside:Point|null;game:CasinoGame|null;model:string|null;dealerIntent:'buy'|'specs'|'catalog'}>(()=>({inside:null,outside:null,game:null,model:null,dealerIntent:'catalog'}));
export function enterVenue(kind:Venue,p:Point){
  const b=VENUES[kind],o=civicOffset();
  useVenue.setState({inside:kind,outside:{...p},game:null,model:null,dealerIntent:'catalog'});
  Object.assign(p,{x:o.x+(b.x0+b.x1)/2,y:0,z:o.z+b.z0+2.5,yaw:Math.PI,bodyYaw:Math.PI,pitch:-.15});
  useGame.getState().setTool('select');useGame.getState().setOverlay(null);
}
export function exitVenue(p:Point){
  const s=useVenue.getState();if(s.outside)Object.assign(p,s.outside);
  useVenue.setState({inside:null,outside:null});useGame.getState().setOverlay(null);
}
