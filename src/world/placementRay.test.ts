import { expect, it } from 'vitest';
import * as THREE from 'three';
import { placementPoint } from './placementRay';

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
