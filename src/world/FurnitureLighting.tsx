import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { furnitureLightSources, nearestFurnitureLights } from './furnitureLights';
import type { LightCandidate } from './furnitureLights';
import { interiorShadeEnabled,interiorRegions } from './interiorShade';
import { indoorSurface,roomLightReaches } from '../building/roomLighting';
import { useGame } from '../state/store';

/** Fixed global budget, shared by all homes. No lamp adds shadow maps or unbounded shader lights. */
export function FurnitureLighting({ mobile }: { mobile: boolean }) {
  const pool = useRef<(THREE.PointLight | null)[]>([]), elapsed = useRef(1);
  const position = useRef(new THREE.Vector3());
  const localCamera=useRef(new THREE.Vector3()),localLight=useRef(new THREE.Vector3());
  const budget = mobile ? 3 : 6;
  useFrame(({camera,scene}, dt) => {
    interiorShadeEnabled.value=useGame.getState().mode==='walk'?1:0;
    elapsed.current += dt; if (elapsed.current < .15) return; elapsed.current = 0;
    let room: {group:THREE.Group;house:import('../building/types').House}|undefined;
    for(const [group,house] of interiorRegions){
      let root:THREE.Object3D=group;while(root.parent)root=root.parent;
      if(root!==scene)continue;
      group.worldToLocal(localCamera.current.copy(camera.position));
      if(indoorSurface(house,localCamera.current.x,localCamera.current.y,localCamera.current.z)){room={group,house};break;}
    }
    const candidates: LightCandidate[] = [];
    for (const [source, light] of furnitureLightSources) {
      let visible = true,root:THREE.Object3D=source;
      for (let node: THREE.Object3D | null = source; node; node = node.parent) {root=node;if (!node.visible) { visible = false; break; }}
      if (!visible || !source.parent || root!==scene) continue;
      source.getWorldPosition(position.current);
      if(room){room.group.worldToLocal(localLight.current.copy(position.current));if(!roomLightReaches(room.house,localLight.current,localCamera.current))continue;}
      candidates.push({ x: position.current.x, y: position.current.y, z: position.current.z, light });
    }
    const selected = nearestFurnitureLights(candidates, camera.position, budget);
    pool.current.forEach((lamp, i) => {
      if (!lamp) return;
      const candidate = selected[i]; lamp.intensity = candidate?.light.intensity ?? 0;
      if (candidate) {
        lamp.position.set(candidate.x, candidate.y, candidate.z);
        lamp.color.set(candidate.light.color); lamp.distance = candidate.light.distance;
      }
    });
  });
  return <>{Array.from({length:budget}, (_,i) => <pointLight key={i} ref={v=>{pool.current[i]=v;}} name={'furniture-light-'+i} intensity={0} decay={2} castShadow={false}/>)}</>;
}
