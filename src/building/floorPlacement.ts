import { MAX_LEVEL } from './dimensions';
import { canPlaceFloor, floorEdgesTouch } from './rules';
import type { Rect } from './rules';
import type { House } from './types';

/** 床の外側に向けたポインターも、接続できる上階の床面で読む。 */
export function floorExtensionLevel(house: House, surface: number, rectAt: (level: number) => Rect | null): number | null {
  for (let level = MAX_LEVEL; level >= Math.max(1, surface); level--) {
    const rect = rectAt(level);
    if (rect && house.floors.some(f => f.level === level && floorEdgesTouch(f, rect)) && canPlaceFloor(house, level, rect) === null) return level;
  }
  return null;
}
