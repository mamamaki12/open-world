import * as THREE from 'three';
import { floorY } from '../building/dimensions';
import { materialGroup, movableBuilding } from '../building/groups';
import type { PartRef } from '../building/types';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';

export function beginPartDrag(ref: PartRef, ray: THREE.Ray, clientX: number, clientY: number) {
  const game = useGame.getState();
  if (game.mode !== 'build' || game.tool !== 'select') return;
  game.select(ref);
  if (ref.kind === 'furniture') {
    const item = game.house.furniture.find(p => p.id === ref.id);
    if (!item || item.wallMount) return;
    const point = ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY(item.level)), new THREE.Vector3());
    if (!point) return;
    game.beginDrag();
    useInteraction.getState().setFurnitureDrag({ id: item.id, dx: point.x - item.x, dz: point.z - item.z, startX: clientX, startY: clientY });
    return;
  }
  if (!movableBuilding(ref)) return;
  const parts = ref.kind === 'wall' ? game.house.walls : ref.kind === 'floor' ? game.house.floors : ref.kind === 'roof' ? game.house.roofs : game.house.stairs;
  const part = parts.find(p => p.id === ref.id);
  if (!part) return;
  const level = part.level + (ref.kind === 'roof' ? 1 : 0);
  const point = ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY(level)), new THREE.Vector3());
  if (!point) return;
  game.beginDrag();
  useInteraction.setState({ buildingDrag: { refs: materialGroup(game.house, ref, game.groupSelection), level, x: point.x, z: point.z,
    startX: clientX, startY: clientY, dx: 0, dz: 0, error: null } });
}
