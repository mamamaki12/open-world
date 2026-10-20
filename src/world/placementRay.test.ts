import { expect, it } from 'vitest';
import * as THREE from 'three';
import { centerIntersections, placementPoint } from './placementRay';

it('does not let a newly mounted remote building block the local wall before its first render', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, 1, .1, 200);
  camera.position.set(0, 1, 5); camera.lookAt(0, 1, 0);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 3, .2)); wall.position.set(0, 1, -1);
  scene.add(wall); scene.updateMatrixWorld(true); camera.updateMatrixWorld();
  const remote = new THREE.Group(); remote.position.x = 50;
  const newlyMounted = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2));
  remote.add(newlyMounted); scene.add(remote);
  const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(), camera);
  expect(ray.intersectObjects([wall, remote], true)[0].object).toBe(newlyMounted);
  expect(centerIntersections(ray, camera, [wall, remote], 7)[0].object).toBe(wall);
  wall.geometry.dispose(); newlyMounted.geometry.dispose();
});

it('uses the current camera and ancestor transforms and keeps the aim reach limit', () => {
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 200), parent = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 3, .2)); parent.add(wall);
  camera.updateMatrixWorld(); parent.updateMatrixWorld(true);
  camera.position.set(20, 1, 5); camera.lookAt(20, 1, 0); parent.position.set(20, 1, 0);
  const ray = new THREE.Raycaster();
  expect(centerIntersections(ray, camera, [wall], 7)[0].object).toBe(wall);
  expect(centerIntersections(ray, camera, [wall], 1)).toHaveLength(0);
  wall.geometry.dispose();
});

it.each([[390, 844], [844, 390]])('places under the finger on a %sx%s mobile canvas with UI offsets', (width, height) => {
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
  camera.position.set(8, 30, 8.001);
  camera.lookAt(8, 0, 8);
  camera.updateMatrixWorld();
  const bounds = { left: 25, top: 80, width, height };
  const x = bounds.left + width * 0.6, y = bounds.top + height * 0.4;
  for (const level of [0, 1, 2]) {
    const point = placementPoint(camera, bounds, x, y, level)!;
    const projected = point.clone().project(camera);
    expect(bounds.left + (projected.x + 1) * width / 2).toBeCloseTo(x);
    expect(bounds.top + (1 - projected.y) * height / 2).toBeCloseTo(y);
  }
});
it('handles hidden or zero-size canvases without invalid coordinates', () => {
  expect(placementPoint(new THREE.PerspectiveCamera(), { left: 0, top: 0, width: 0, height: 0 }, 10, 10, 0)).toBeNull();
});
