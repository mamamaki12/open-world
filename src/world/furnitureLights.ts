import type { Object3D } from 'three';
import type { FurnitureDef } from '../catalog';
export type FurnitureLight = NonNullable<FurnitureDef['light']>;
/** Only placed furniture registers. Preview/designer/catalog models never consume a light slot. */
export const furnitureLightSources = new Map<Object3D, FurnitureLight>();
export interface LightCandidate { x: number; y: number; z: number; light: FurnitureLight }
export function nearestFurnitureLights(candidates: LightCandidate[], camera: {x:number;y:number;z:number}, budget: number) {
  return candidates.map(c => ({ ...c, distance2: (c.x-camera.x)**2+(c.y-camera.y)**2+(c.z-camera.z)**2 }))
    .filter(c => c.distance2 < 30**2).sort((a,b) => a.distance2-b.distance2).slice(0, budget);
}
