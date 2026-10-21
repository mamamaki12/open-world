import * as THREE from 'three';
import { BASE_HEIGHT, GRID, MAX_LEVEL, STORY_HEIGHT } from '../building/dimensions';
import { canPlaceFloor } from '../building/rules';
import { floorExtensionLevel } from '../building/floorPlacement';
import type { House } from '../building/types';
import { placementPoint } from './placementRay';

type Bounds = { left: number; top: number; width: number; height: number };

/** 予約判定と配置で、同じ見えている面を使う。activeLevelは最後のプレビューの階でしかない。 */
export function pointerSurfaceLevel(camera: THREE.Camera, bounds: Bounds, x: number, y: number, house: THREE.Object3D | undefined): number {
  if (!bounds.width || !bounds.height) return 0;
  camera.updateWorldMatrix(true, false);
  house?.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((x-bounds.left)/bounds.width*2-1, -(y-bounds.top)/bounds.height*2+1), camera);
  const hit = house && ray.intersectObject(house, true).find(h => {
    const material = (h.object as THREE.Mesh).material;
    return material && (Array.isArray(material) ? material : [material]).some(m => !m.transparent || m.opacity >= .99);
  });
  const ground = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0), 0), new THREE.Vector3());
  if (!hit || ground && ground.distanceTo(ray.ray.origin) < hit.distance) return 0;
  return Math.max(0, Math.min(MAX_LEVEL, Math.floor((hit.point.y-BASE_HEIGHT+.15)/STORY_HEIGHT)));
}

export function floorPointerLevel(house: House, camera: THREE.Camera, bounds: Bounds, x: number, y: number, object: THREE.Object3D | undefined): number {
  const surface = pointerSurfaceLevel(camera, bounds, x, y, object);
  const rectAt = (level: number) => {
    const p = placementPoint(camera, bounds, x, y, level);
    if (!p) return null;
    const x0 = Math.floor(p.x/GRID), z0 = Math.floor(p.z/GRID);
    return { x0, z0, x1:x0+1, z1:z0+1 };
  };
  const extension = floorExtensionLevel(house, surface, rectAt);
  if (extension !== null) return extension;
  const rect = rectAt(surface);
  if (rect) for (let level=surface;level<=MAX_LEVEL;level++) if (canPlaceFloor(house,level,rect) === null) return level;
  return surface;
}
