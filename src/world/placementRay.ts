import * as THREE from 'three';
import { floorY } from '../building/dimensions';

/** CanvasのCSS上の位置・サイズを使う（端末の解像度やUIの余白には依存しない）。 */
export function placementPoint(camera: THREE.Camera, bounds: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number, level: number) {
  if (!bounds.width || !bounds.height) return null;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1), camera);
  return raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY(level)), new THREE.Vector3());
}
