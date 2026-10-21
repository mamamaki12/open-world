import * as THREE from 'three';
import { floorY } from '../building/dimensions';
import type { PartRef } from '../building/types';
import { useGame } from '../state/store';
import { useInteraction } from '../state/interaction';

/** 配置直後の家具だけを編集する。建築パーツの選択や長押し削除は行わない。 */
export function beginPartDrag(ref: PartRef, ray: THREE.Ray, clientX: number, clientY: number) {
  const game = useGame.getState();
  if (useInteraction.getState().furnitureDrag || useInteraction.getState().buildingDrag) return;
  if (game.mode !== 'build' || game.tool !== 'select' || ref.kind !== 'furniture' || game.selection?.kind !== 'furniture' || game.selection.id !== ref.id) return;
  const item = game.house.furniture.find(p => p.id === ref.id);
  if (!item || item.wallMount) return;
  const point = ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY(item.level)), new THREE.Vector3());
  if (!point) return;
  game.beginDrag();
  useInteraction.getState().setFurnitureDrag({ id: item.id, dx: point.x - item.x, dz: point.z - item.z, startX: clientX, startY: clientY });
}
