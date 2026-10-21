import { BASE_HEIGHT, GRID, STORY_HEIGHT, WALL_HEIGHT, floorY } from './dimensions';
import { stairHoles,wallBaseY,wallHeight } from './rules';
import type { House } from './types';
import { furnitureDef } from '../catalog';

const contains = (r: {x0:number;x1:number;z0:number;z1:number}, x:number,z:number) =>
  x >= r.x0*GRID-.002 && x <= r.x1*GRID+.002 && z >= r.z0*GRID-.002 && z <= r.z1*GRID+.002;
const coverageCache=new WeakMap<House,Map<number,{floors:House['floors'];covers:{x0:number;x1:number;z0:number;z1:number}[];holes:ReturnType<typeof stairHoles>}>>();

/** Same ceiling coverage as Floor: room slab above, or a roof above a room floor, excluding stairwells. */
export function hasRoomCeiling(h:House,level:number,x:number,z:number):boolean {
  let levels=coverageCache.get(h);if(!levels)coverageCache.set(h,levels=new Map());
  let data=levels.get(level);if(!data){data={floors:h.floors.filter(f=>f.level===level&&f.kind!=='terrace'),covers:[...h.roofs.filter(r=>r.level===level),...h.floors.filter(f=>f.level===level+1)],holes:stairHoles(h,level+1)};levels.set(level,data);}
  return data.floors.some(f=>contains(f,x,z))&&!data.holes.some(r=>contains(r,x,z))&&data.covers.some(r=>contains(r,x,z));
}

export function indoorSurface(h:House,x:number,y:number,z:number,levelHint?:number):boolean {
  const level=levelHint??Math.floor((y-BASE_HEIGHT+.02)/STORY_HEIGHT);
  return level>=0 && y>=floorY(level)-.06&&y<=floorY(level)+WALL_HEIGHT+.02 && hasRoomCeiling(h,level,x,z);
}

/** Avoid selecting a lamp behind another room's wall or on another storey. No shadow maps. */
export function roomLightReaches(h:House,from:{x:number;y:number;z:number},to:{x:number;y:number;z:number}):boolean {
  const level=Math.floor((to.y-BASE_HEIGHT)/STORY_HEIGHT);
  if(!hasRoomCeiling(h,level,from.x,from.z)||from.y<floorY(level)||from.y>floorY(level)+WALL_HEIGHT)return false;
  return !h.walls.some(w=>{
    if(w.level!==level||wallHeight(w)<WALL_HEIGHT)return false;
    const vertical=w.x0===w.x1,a=vertical?from.x:from.z,b=vertical?to.x:to.z,plane=(vertical?w.x0:w.z0)*GRID;
    if(Math.abs(b-a)<.0001)return false;const t=(plane-a)/(b-a);if(t<=.001||t>=.999)return false;
    const y=from.y+(to.y-from.y)*t;if(y<wallBaseY(w)||y>wallBaseY(w)+wallHeight(w))return false;
    const cross=vertical?from.z+(to.z-from.z)*t:from.x+(to.x-from.x)*t;
    return cross>=Math.min(vertical?w.z0:w.x0,vertical?w.z1:w.x1)*GRID-.01&&cross<=Math.max(vertical?w.z0:w.x0,vertical?w.z1:w.x1)*GRID+.01;
  });
}

export function ceilingEditError(before:House,after:House):string|null {
  for(const f of after.furniture){
    if(!furnitureDef(f).ceiling||hasRoomCeiling(after,f.level,f.x,f.z))continue;
    const old=before.furniture.find(p=>p.id===f.id);
    if(!old||old.type!==f.type||old.level!==f.level||old.x!==f.x||old.z!==f.z)return '天井のある部屋に設置してください';
  }
  return null;
}
export function detachUnsupportedCeilingLights(before:House,after:House):House {
  if(before.floors===after.floors&&before.roofs===after.roofs&&before.stairs===after.stairs)return after;
  const furniture=after.furniture.filter(f=>!furnitureDef(f).ceiling||hasRoomCeiling(after,f.level,f.x,f.z));
  return furniture.length===after.furniture.length?after:{...after,furniture};
}

/** Only used when generating defaults; never modifies saved user houses. */
export function withDefaultRoomLights(h:House):House {
  const added:House['furniture']=[];
  const levels=[...new Set(h.floors.map(f=>f.level))];
  for(const level of levels){
    const cells=new Map<string,{x:number;z:number}>();
    for(const f of h.floors.filter(f=>f.level===level&&f.kind!=='terrace'))
      for(let x=Math.floor(f.x0);x<f.x1;x++)for(let z=Math.floor(f.z0);z<f.z1;z++){
        const p={x:(x+.5)*GRID,z:(z+.5)*GRID};if(hasRoomCeiling(h,level,p.x,p.z))cells.set(`${x},${z}`,p);
      }
    const walls=h.walls.filter(w=>w.level===level&&!w.height);
    const blocked=(a:{x:number;z:number},b:{x:number;z:number})=>walls.some(w=>{
      const x0=Math.min(w.x0,w.x1)*GRID,x1=Math.max(w.x0,w.x1)*GRID,z0=Math.min(w.z0,w.z1)*GRID,z1=Math.max(w.z0,w.z1)*GRID;
      return w.x0===w.x1? Math.min(a.x,b.x)<x0&&Math.max(a.x,b.x)>x0&&a.z>=z0&&a.z<=z1:
        Math.min(a.z,b.z)<z0&&Math.max(a.z,b.z)>z0&&a.x>=x0&&a.x<=x1;
    });
    while(cells.size){
      const first=cells.keys().next().value!,queue=[first],room:{x:number;z:number}[]=[];
      const pending=new Set([first]);
      for(let i=0;i<queue.length;i++){
        const key=queue[i],p=cells.get(key)!;room.push(p);const [x,z]=key.split(',').map(Number);
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const k=`${x+dx},${z+dz}`,q=cells.get(k);if(q&&!pending.has(k)&&!blocked(p,q)){pending.add(k);queue.push(k);}
        }
      }
      for(const key of pending)cells.delete(key);
      const centre={x:room.reduce((s,p)=>s+p.x,0)/room.length,z:room.reduce((s,p)=>s+p.z,0)/room.length};
      room.sort((a,b)=>Math.hypot(a.x-centre.x,a.z-centre.z)-Math.hypot(b.x-centre.x,b.z-centre.z));
      const placed:{x:number;z:number}[]=[];
      for(const p of room){
        if(placed.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<3.6))continue;
        placed.push(p);
        added.push({id:`default-light-${level}-${added.length}`,level,type:room.length<14?'ceiling-disc-light':'ceiling-panel-light',...p,rotation:0,color:'#f0ece4'});
      }
    }
  }
  return {...h,furniture:[...h.furniture,...added]};
}
