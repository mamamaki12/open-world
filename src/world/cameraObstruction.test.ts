import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { avoidCameraWalls } from './cameraObstruction';

describe('driving camera near buildings', () => {
  it('keeps the camera in front of a showroom wall', () => {
    const scene = new THREE.Scene();
    const dealer = new THREE.Group(); dealer.name = 'dealer';
    const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 6, .25), new THREE.MeshBasicMaterial());
    wall.position.set(0, 3, -3); dealer.add(wall); scene.add(dealer); scene.updateMatrixWorld(true);
    const focus = new THREE.Vector3(0, 1, 0);
    const result = avoidCameraWalls(scene, focus, new THREE.Vector3(0, 4, -7));
    expect(result.z).toBeGreaterThan(-2.875);
    expect(result.distanceTo(focus)).toBeLessThan(4);
  });
  it('does not shorten an unobstructed view or collide with transparent glass', () => {
    const scene = new THREE.Scene();
    const glass = new THREE.Mesh(new THREE.BoxGeometry(10, 6, .25), new THREE.MeshBasicMaterial({ transparent: true, opacity: .3 }));
    glass.name = 'dealer'; glass.position.z = -2; scene.add(glass); scene.updateMatrixWorld(true);
    const desired = new THREE.Vector3(0, 2, -7);
    expect(avoidCameraWalls(scene, new THREE.Vector3(0, 1, 0), desired)).toBe(desired);
  });
});
