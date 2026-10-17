import * as THREE from 'three';

const BLOCKERS = ['house', 'casino', 'estate', 'dealer', 'tuner', 'exchange', 'salon', 'boutiques', 'venue-interior', 'neighbors'];
const ray = new THREE.Raycaster();

/** カメラまでの線上に不透明な建物があれば、その手前に寄せる。 */
export function avoidCameraWalls(scene: THREE.Scene, focus: THREE.Vector3, desired: THREE.Vector3) {
  const delta = desired.clone().sub(focus);
  const distance = delta.length();
  if (distance < .001) return desired;
  ray.set(focus, delta.divideScalar(distance));
  ray.far = distance;
  const blockers = BLOCKERS.map(name => scene.getObjectByName(name)).filter((o): o is THREE.Object3D => !!o);
  const hit = ray.intersectObjects(blockers, true).find(h => {
    const mat = (h.object as THREE.Mesh).material;
    const m = Array.isArray(mat) ? mat[h.face?.materialIndex ?? 0] : mat;
    return m && m.visible && !m.transparent;
  });
  return hit ? focus.clone().addScaledVector(delta, Math.max(.3, hit.distance - .25)) : desired;
}
