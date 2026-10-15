import { ESTATE } from './landmarks';
/** 不動産屋のすぐ東隣。全てcivic site基準。 */
export const DEALER = { x0: ESTATE.x1+3, x1: ESTATE.x1+21, z0: ESTATE.z0, z1: ESTATE.z0+12, height:5.2 };
export function atDealerDoor(x:number,z:number,y=0) {
  return Math.abs(y)<.5 && Math.abs(x-(DEALER.x0+DEALER.x1)/2)<2.4 && z>DEALER.z0-2.7 && z<=DEALER.z0+.05;
}
