import { furnitureBounds, getFurniture } from '../catalog';
import { GRID, lotSize } from './dimensions';
import { snapFurniture } from './rules';
import type { FurniturePart, House } from './types';

type Item = Pick<FurniturePart, 'type' | 'rotation' | 'level'> & { id?: string };
const REACH = 0.15;

/** 回転と原点からの偏りも含めた、家具のワールド座標での外形。 */
function offsets(item: Item) {
  const b = furnitureBounds(getFurniture(item.type));
  const a = item.rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const points = [b.minX, b.maxX].flatMap(x => [b.minZ, b.maxZ].map(z => ({ x: x * c + z * s, z: -x * s + z * c })));
  return {
    x: [Math.min(...points.map(p => p.x)), 0, Math.max(...points.map(p => p.x))],
    z: [Math.min(...points.map(p => p.z)), 0, Math.max(...points.map(p => p.z))],
  };
}

/** 通常は10cm刻み。近くの同じ階の家具の中心・端に15cm以内で吸着する。 */
export function snapFurniturePlacement(house: House, item: Item, x: number, z: number, fine = false) {
  if (fine) return snapFurniture(x, z);
  const bounds = offsets(item);
  const candidates: Record<'x' | 'z', number[]> = { x: [], z: [] };
  for (const other of house.furniture) {
    if (other.id === item.id || other.level !== item.level || Math.hypot(other.x - x, other.z - z) > 5) continue;
    const target = offsets(other);
    for (const axis of ['x', 'z'] as const) {
      // 中心同士、同じ側の端、隣り合う端を合わせる。中心と端は混ぜない。
      for (const [from, to] of [[1, 1], [0, 0], [2, 2], [0, 2], [2, 0]]) {
        candidates[axis].push(other[axis] + target[axis][to] - bounds[axis][from]);
      }
    }
  }
  const snap = (value: number, axis: 'x' | 'z', max: number) => {
    let result = Math.round(value / 0.1) * 0.1;
    let distance = REACH + 1e-8;
    for (const candidate of candidates[axis]) {
      const d = Math.abs(candidate - value);
      if (candidate >= 0 && candidate <= max && d < distance) { result = candidate; distance = d; }
    }
    return +Math.min(max, Math.max(0, result)).toFixed(4);
  };
  return { x: snap(x, 'x', lotSize.w * GRID), z: snap(z, 'z', lotSize.d * GRID) };
}
