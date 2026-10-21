import * as THREE from 'three';

const BLOCKERS = ['house', 'casino', 'estate', 'dealer', 'tuner', 'exchange', 'salon', 'boutiques', 'venue-interior', 'neighbors'];
const ray = new THREE.Raycaster();
const roots = new WeakMap<THREE.Scene, { at: number; objects: THREE.Object3D[] }>();

/** カメラまでの線上に不透明な建物があれば、その手前に寄せる。 */
export function avoidCameraWalls(scene: THREE.Scene, focus: THREE.Vector3, desired: THREE.Vector3) {
  const delta = desired.clone().sub(focus);
  const distance = delta.length();
  if (distance < .001) return desired;
  ray.set(focus, delta.divideScalar(distance));
  ray.far = distance;
  let cached = roots.get(scene);
  const now = performance.now();
  if (!cached || now - cached.at > 1000 || cached.objects.some(o => !o.parent)) {
    cached = { at: now, objects: BLOCKERS.map(name => scene.getObjectByName(name)).filter((o): o is THREE.Object3D => !!o) };
    roots.set(scene, cached);
  }
  const blockers: THREE.Object3D[] = [];
  // Three's recursive raycast includes invisible children. Only the active LOD
  // should obstruct the camera; do not intersect hidden interiors/variants.
  for (const root of cached.objects) root.traverseVisible(o => { if ((o as THREE.Mesh).isMesh) blockers.push(o); });
  const hit = ray.intersectObjects(blockers, false).find(h => {
    const mat = (h.object as THREE.Mesh).material;
    const m = Array.isArray(mat) ? mat[h.face?.materialIndex ?? 0] : mat;
    return m && m.visible && !m.transparent;
  });
  return hit ? focus.clone().addScaledVector(delta, Math.max(.3, hit.distance - .25)) : desired;
}
