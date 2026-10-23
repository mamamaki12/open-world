import { useLayoutEffect,useMemo,useRef } from 'react';
import type { ReactNode } from 'react';
import type { Group } from 'three';
import { getFurniture } from '../catalog';
import { FurnitureModel } from './parts/Furniture';
import { PlacedLightSource } from './PlacedLightSource';
import { markCoveredSurfaces } from './interiorShade';

/** Fixed fixtures use the furniture pool, including its mobile cap and distance culling. */
export function VenueFixtures({width,depth,height,warm,children}:{width:number;depth:number;height:number;warm:boolean;children:ReactNode}){
  const root=useRef<Group>(null),def=getFurniture(warm?'ceiling-disc-light':'ceiling-panel-light');
  const light=useMemo(()=>({...def.light!,intensity:warm?32:40,distance:10}),[def,warm]);
  useLayoutEffect(()=>{if(root.current)markCoveredSurfaces(root.current,(x,y,z)=>Math.abs(x)<width/2&&Math.abs(z)<depth/2&&y>=-.04&&y<height);},[width,depth,height,children]);
  const xs=width>10?[-width/4,width/4]:[0],zs=depth>8?[-depth/4,depth/4]:[0];
  return <group ref={root} userData={{venueFixtures:true}}>
    {children}
    {xs.flatMap(x=>zs.map(z=><group key={x+','+z} position={[x,height-.1,z]}><FurnitureModel def={def} color="#f0ece4"/><PlacedLightSource light={light}/></group>))}
  </group>;
}
