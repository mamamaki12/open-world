import { useEffect,useRef } from 'react';
import type { Group } from 'three';
import type { FurnitureLight } from './furnitureLights';
import { furnitureLightSources } from './furnitureLights';
export function PlacedLightSource({light}:{light:FurnitureLight}){
  const ref=useRef<Group>(null);
  useEffect(()=>{const o=ref.current;if(!o)return;furnitureLightSources.set(o,light);return()=>{furnitureLightSources.delete(o);};},[light]);
  return <group ref={ref} position={light.position}/>;
}
