import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { House } from '../building/types';
import { GRID, SLAB_THICKNESS, WALL_THICKNESS, floorY } from '../building/dimensions';
import { wallBaseY, wallHeight } from '../building/rules';
import { roofShape } from '../building/roof';
import { slabGeometry } from './geometry';
import { houseEnvelope } from './buildingLod';
import { plainMaterial } from './materials';

/** Colour-grouped solid walls and slabs preserve the real footprint and roof silhouette. */
export function distantHouseGeometry(h:House){
  const buckets=new Map<string,THREE.BufferGeometry[]>();
  const add=(color:string,g:THREE.BufferGeometry)=>{const list=buckets.get(color)??[];list.push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();buckets.set(color,list);};
  const box=(color:string,x:number,y:number,z:number,w:number,height:number,d:number)=>{const g=new THREE.BoxGeometry(w,height,d);g.translate(x,y,z);add(color,g);};
  const outer=houseEnvelope(h).outerWalls;
  for(const w of h.walls){if(!outer.has(w.id))continue;box(w.exterior.color,(w.x0+w.x1)*GRID/2,wallBaseY(w)+wallHeight(w)/2,(w.z0+w.z1)*GRID/2,Math.abs(w.x1-w.x0)*GRID||WALL_THICKNESS,wallHeight(w),Math.abs(w.z1-w.z0)*GRID||WALL_THICKNESS);}
  for(const f of h.floors)box(f.finish.color,(f.x0+f.x1)*GRID/2,floorY(f.level)-SLAB_THICKNESS/2,(f.z0+f.z1)*GRID/2,(f.x1-f.x0)*GRID,SLAB_THICKNESS,(f.z1-f.z0)*GRID);
  for(const r of h.roofs){const shape=roofShape(r);for(const slab of shape.planes)add(r.finish.color,slabGeometry(slab));for(const slab of shape.gables)add(r.gableFinish.color,slabGeometry(slab));}
  return [...buckets].flatMap(([color,parts])=>{const geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!geometry)return [];geometry.computeBoundingSphere();return [{geometry,material:plainMaterial(color,'none',{roughness:.9})}];});
}
export function DistantHouse({house}:{house:House}){
  const parts=useMemo(()=>distantHouseGeometry(house),[house]);
  useEffect(()=>()=>parts.forEach(p=>p.geometry.dispose()),[parts]);
  return <group dispose={null} userData={{distantHouse:true}}>{parts.map((part,i)=><mesh key={i} geometry={part.geometry} material={part.material} castShadow receiveShadow/>)}</group>;
}

