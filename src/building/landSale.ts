import { GRID, LOT_D } from './dimensions';
import { plotX, plotZ } from '../economy/town';
export function atSaleSign(plot:number,x:number,z:number,y=0) {
  const sx=plotX(plot)-1.1,sz=plotZ(plot)+LOT_D*GRID-.4;
  return Math.abs(y)<.6&&Math.abs(x-sx)<1.6&&z>sz+.05&&z<sz+2.6;
}
