import { getFurniture, getOpening } from '../catalog';
import { BASE_HEIGHT, GRID, LOT_D, LOT_W, MAX_LEVEL, STORY_HEIGHT } from './dimensions';
import { axisAlignedSegment, canPlaceFloor, canPlaceOpening, canPlaceRoof, canPlaceStair, canPlaceWall, newId, normalizeRect, removePart, snapOpeningOffset, wallDir, wallLength } from './rules';
import { mountedTransform, nameplateMount } from './mounts';
import { snapFurniturePlacement } from './furnitureSnap';
import type { Defaults, Tool } from '../state/store';
import type { House, PartRef } from './types';
import type { Preview } from '../state/interaction';

export interface AimPoint { x:number; y:number; z:number; ref?:PartRef }
export interface Anchor {x:number;z:number;level:number}
export function aimPlan(h:House,tool:Tool,d:Defaults,p:AimPoint,viewer:{x:number;z:number},rot:0|1|2|3,anchor:Anchor|null) {
  const level=Math.max(0,Math.min(MAX_LEVEL,Math.floor((p.y-BASE_HEIGHT+.15)/STORY_HEIGHT)));
  const range=tool==='floor'||tool==='wall'||tool==='roof';
  const point={x:Math.floor(p.x/GRID),z:Math.floor(p.z/GRID),level};
  if(tool==='wall'){point.x=Math.round(p.x/GRID);point.z=Math.round(p.z/GRID);}
  if(p.x<0||p.z<0||p.x>LOT_W*GRID||p.z>LOT_D*GRID)return {error:'自分の土地の中を狙ってください'};
  const a=anchor??point,l=anchor?.level??level;
  let next=h,error:string|null=null,preview:Preview|null=null;
  if(tool==='floor'||tool==='roof'){
    const rect=normalizeRect({x0:a.x,z0:a.z,x1:point.x,z1:point.z});rect.x1++;rect.z1++;
    const roofLevel=Math.max(0,l-1);
    error=tool==='floor'?canPlaceFloor(h,l,rect):canPlaceRoof(h,roofLevel,rect);
    preview={kind:'rect',rect,valid:!error,tool};
    if(tool==='floor')next={...h,floors:[...h.floors,{id:newId('floor'),level:l,...rect,finish:d.floorKind==='terrace'?d.terrace:d.floor,...(d.floorKind==='terrace'?{kind:'terrace' as const}:{})}]};
    else next={...h,roofs:[...h.roofs,{id:newId('roof'),level:roofLevel,...rect,type:d.roofType,axis:rect.x1-rect.x0>=rect.z1-rect.z0?'x':'z',flip:false,pitch:d.roofType==='flat'?0:d.roofPitch,overhang:d.roofType==='flat'?0:d.roofOverhang,finish:d.roofType==='flat'?{material:'sheet',color:'#8f9294'}:d.roofFinish,gableFinish:d.wallExterior}]};
  }else if(tool==='wall'){
    const seg=axisAlignedSegment(a,point),base=d.wallHeight==='fence'||d.wallHeight==='privacyFence'?0:l;
    error=seg.x0===seg.x1&&seg.z0===seg.z1?'終点に照準を合わせてください':canPlaceWall(h,{level:base,...seg});
    preview={kind:'wall',...seg,valid:!error};
    next={...h,walls:[...h.walls,{id:newId('wall'),level:base,...seg,exterior:d.wallExterior,interior:d.wallInterior,height:d.wallHeight}]};
  }else if(tool==='stair'){
    const st={level,x:point.x,z:point.z,rot,shape:d.stairShape};error=canPlaceStair(h,st);
    preview={kind:'stair',x:point.x,z:point.z,valid:!error};
    next={...h,stairs:[...h.stairs,{id:newId('stair'),...st,finish:d.stairFinish,rail:d.stairRail}]};
  }else if(tool==='door'||tool==='window'||(tool==='furniture'&&d.furnitureType==='nameplate')){
    const wall=p.ref?.kind==='wall'?h.walls.find(w=>w.id===p.ref!.id):undefined;
    if(!wall)return {error:'取り付ける壁面を狙ってください'};
    if(tool==='furniture'){
      const mount=nameplateMount(h,wall,p,viewer);if(!mount)return {error:'窓やドアを避けて壁を狙ってください'};
      const t=mountedTransform(h,mount)!;preview={kind:'nameplate',mount};
      next={...h,furniture:[...h.furniture,{id:newId('furniture'),type:'nameplate',level:wall.level,x:t.x,z:t.z,rotation:t.rotation,color:'#f2efe8',label:d.nameplateText,wallMount:mount}]};
    }else{
      const type=tool==='door'?d.doorType:d.windowType,{dx,dz}=wallDir(wall);
      const offset=snapOpeningOffset(wallLength(wall),(p.x-wall.x0*GRID)*dx+(p.z-wall.z0*GRID)*dz,getOpening(type).width);
      error=canPlaceOpening(h,wall.id,type,offset);preview={kind:'opening',wallId:wall.id,offset,valid:!error};
      next={...h,openings:[...h.openings,{id:newId('opening'),wallId:wall.id,kind:tool,type,offset,sashColor:d.sashColor,sash:d.sashType,panelColor:d.panelColor}]};
    }
  }else if(tool==='furniture'){
    const def=getFurniture(d.furnitureType),pos=snapFurniturePlacement(h,{level,type:def.id,rotation:d.furnitureRotation},p.x,p.z,false);
    preview={kind:'furniture',...pos};
    next={...h,furniture:[...h.furniture,{id:newId('furniture'),level,type:def.id,...pos,rotation:d.furnitureRotation,color:def.colors[0],...(def.label?{label:d.nameplateText}:{})}]};
  }else if(tool==='erase'){
    if(!p.ref)return {error:'消すパーツを狙ってください'};
    next=removePart(h,p.ref);
  }
  return {error,next,preview,point,range};
}
