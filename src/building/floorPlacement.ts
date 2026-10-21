import { MAX_LEVEL } from './dimensions';
import { canPlaceFloor, floorEdgesTouch, rectInsideLot } from './rules';
import type { Rect } from './rules';
import type { House } from './types';

const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

/** 描いた範囲のうち既存床を除いた部分を、重ならない矩形として追加する。 */
export function floorPlacementPlan(house: House, level: number, rect: Rect): { rects: Rect[]; error: string | null } {
  if (!rectInsideLot(rect) || level < 0 || level > MAX_LEVEL) return { rects: [], error: '土地の外には置けません' };
  let rects = [rect];
  for (const floor of house.floors.filter(f => f.level === level)) {
    rects = rects.flatMap(r => {
      if (!overlaps(r, floor)) return [r];
      const x0 = Math.max(r.x0, floor.x0), x1 = Math.min(r.x1, floor.x1);
      const z0 = Math.max(r.z0, floor.z0), z1 = Math.min(r.z1, floor.z1);
      return [
        { x0: r.x0, x1: r.x1, z0: r.z0, z1: z0 },
        { x0: r.x0, x1: r.x1, z0: z1, z1: r.z1 },
        { x0: r.x0, x1: x0, z0, z1 },
        { x0: x1, x1: r.x1, z0, z1 },
      ].filter(p => p.x1 > p.x0 && p.z1 > p.z0);
    });
  }
  if (!rects.length) return { rects: [], error: 'この範囲にはすでに床があります' };
  // 同時に追加する床同士の支持も、完成した接続関係で検証する。
  const candidates = rects.map((r, i) => ({ ...r, id: `preview-floor-${i}`, level, finish: { material: 'flooring', color: '#ffffff' } }));
  for (let i = 0; i < rects.length; i++) {
    const error = canPlaceFloor({ ...house, floors: [...house.floors, ...candidates.filter((_, j) => i !== j)] }, level, rects[i]);
    if (error) return { rects: [], error };
  }
  return { rects, error: null };
}

/** 床の外側に向けたポインターも、接続できる上階の床面で読む。 */
export function floorExtensionLevel(house: House, surface: number, rectAt: (level: number) => Rect | null): number | null {
  const hitRect = rectAt(surface);
  if (hitRect && house.floors.some(f => f.level === surface && overlaps(f, hitRect))) return surface;
  for (let level = MAX_LEVEL; level >= Math.max(0, surface); level--) {
    const rect = rectAt(level);
    if (!rect) continue;
    // 床の上から始めたときは、その階に固定。上の階へ繰り上げない。
    if (house.floors.some(f => f.level === level && overlaps(f, rect))) return level;
    if (house.floors.some(f => f.level === level && floorEdgesTouch(f, rect)) && canPlaceFloor(house, level, rect) === null) return level;
  }
  return null;
}
