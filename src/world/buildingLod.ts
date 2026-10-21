import type { House, PartRef } from '../building/types';
import { floorCovers, stairFootprint, wallBaseY, wallHeight, wallOutsideSide } from '../building/rules';
import { GRID, LOT_D, LOT_W, floorY } from '../building/dimensions';
import { roofShape } from '../building/roof';

export type BuildingTier='near'|'exterior'|'distant';
export interface BuildingBounds {x0:number;x1:number;y0:number;y1:number;z0:number;z1:number}
/** Distances are from the envelope, not its centre (important for towers and joined lots). */
export function distanceToBuilding(p:{x:number;y:number;z:number},b:BuildingBounds):number {
  return Math.hypot(Math.max(b.x0-p.x,0,p.x-b.x1),Math.max(b.y0-p.y,0,p.y-b.y1),Math.max(b.z0-p.z,0,p.z-b.z1));
}
export function buildingTier(distance:number,previous:BuildingTier,mobile=false):BuildingTier {
  if(distance<=(mobile?20:36))return 'near';
  if(previous==='near'&&distance<(mobile?28:46))return 'near';
  if(distance>=(mobile?80:120))return 'distant';
  if(previous==='distant'&&distance>(mobile?68:105))return 'distant';
  return 'exterior';
}
const envelopes=new WeakMap<House,{bounds:BuildingBounds;outerWalls:Set<string>}>();
export function houseEnvelope(h:House){
  const old=envelopes.get(h);if(old)return old;
  const xs:number[]=[],zs:number[]=[],ys=[0];
  for(const f of h.floors){xs.push(f.x0*GRID,f.x1*GRID);zs.push(f.z0*GRID,f.z1*GRID);ys.push(floorY(f.level));}
  for(const w of h.walls){xs.push(w.x0*GRID,w.x1*GRID);zs.push(w.z0*GRID,w.z1*GRID);ys.push(wallBaseY(w)+wallHeight(w));}
  for(const r of h.roofs){xs.push(r.x0*GRID-r.overhang,r.x1*GRID+r.overhang);zs.push(r.z0*GRID-r.overhang,r.z1*GRID+r.overhang);ys.push(roofShape(r).ridgeY);}
  const bounds={x0:xs.length?Math.min(...xs):0,x1:xs.length?Math.max(...xs):LOT_W*GRID,y0:0,y1:Math.max(...ys),z0:zs.length?Math.min(...zs):0,z1:zs.length?Math.max(...zs):LOT_D*GRID};
  const result={bounds,outerWalls:new Set(h.walls.filter(w=>wallOutsideSide(h,w)!==0).map(w=>w.id))};envelopes.set(h,result);return result;
}
/** Keep exterior openings, outdoor furniture/stairs and wall-mounted nameplates. */
export function isInteriorPart(h:House,ref:PartRef|undefined):boolean {
  if(!ref)return false;
  const outer=houseEnvelope(h).outerWalls;
  if(ref.kind==='wall')return !outer.has(ref.id);
  if(ref.kind==='opening'){const o=h.openings.find(o=>o.id===ref.id);return !!o&&!outer.has(o.wallId);}
  if(ref.kind==='furniture'){
    const f=h.furniture.find(f=>f.id===ref.id);if(!f)return false;
    if(f.wallMount)return !outer.has(f.wallMount.wallId);
    return floorCovers(h,f.level,f.x,f.z,true);
  }
  if(ref.kind==='stair'){
    const s=h.stairs.find(s=>s.id===ref.id);if(!s)return false;const r=stairFootprint(s);
    return floorCovers(h,s.level,(r.x0+r.x1)*GRID/2,(r.z0+r.z1)*GRID/2,true);
  }
  return false;
}
