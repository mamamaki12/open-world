import * as THREE from 'three';
import { floorY } from '../building/dimensions';

/** React can add baked meshes between renders, before their world transforms have been drawn. */
export function centerIntersections(ray: THREE.Raycaster, camera: THREE.Camera, objects: THREE.Object3D[], reach: number) {
  camera.updateWorldMatrix(true, false);
  for (const object of objects) object.updateWorldMatrix(true, true);
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  ray.far = reach;
  return ray.intersectObjects(objects, true);
}

/** CanvasのCSS上の位置・サイズを使う（端末の解像度やUIの余白には依存しない）。 */
export function placementPoint(camera: THREE.Camera, bounds: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number, level: number, height = floorY(level)) {
  if (!bounds.width || !bounds.height) return null;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1), camera);
  return raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -height), new THREE.Vector3());
}
