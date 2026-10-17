import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { furnitureLightSources, nearestFurnitureLights } from './furnitureLights';
import type { LightCandidate } from './furnitureLights';

/** Fixed global budget, shared by all homes. No lamp adds shadow maps or unbounded shader lights. */
export function FurnitureLighting({ mobile }: { mobile: boolean }) {
  const pool = useRef<(THREE.PointLight | null)[]>([]), elapsed = useRef(1);
  const position = useRef(new THREE.Vector3());
  const budget = mobile ? 3 : 6;
  useFrame(({camera}, dt) => {
    elapsed.current += dt; if (elapsed.current < .15) return; elapsed.current = 0;
    const candidates: LightCandidate[] = [];
    for (const [source, light] of furnitureLightSources) {
      let visible = true;
      for (let node: THREE.Object3D | null = source; node; node = node.parent) if (!node.visible) { visible = false; break; }
      if (!visible || !source.parent) continue;
      source.getWorldPosition(position.current);
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
