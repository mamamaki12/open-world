import type { Finish, House, PartRef } from './types';
import { GRID } from './dimensions';
import { canPlaceFloor, canPlaceRoof, canPlaceStair, canPlaceWall, partExists } from './rules';

export const movableBuilding = (ref: PartRef) => ['floor', 'wall', 'roof', 'stair'].includes(ref.kind);
const finishKey = (f: Finish) => `${f.material}:${f.color.toLowerCase()}`;
const groupCache = new WeakMap<House, Map<string, PartRef[]>>();

/** 作成日時やIDによらず、同じ種類と仕上げの建築パーツをまとめる。 */
function materialKey(house: House, ref: PartRef): string | null {
  switch (ref.kind) {
    case 'floor': { const p = house.floors.find(p => p.id === ref.id); return p ? `floor:${p.kind ?? 'room'}:${finishKey(p.finish)}` : null; }
    case 'wall': { const p = house.walls.find(p => p.id === ref.id); return p ? `wall:${finishKey(p.exterior)}:${finishKey(p.interior)}` : null; }
    case 'roof': { const p = house.roofs.find(p => p.id === ref.id); return p ? `roof:${finishKey(p.finish)}:${finishKey(p.gableFinish)}` : null; }
    case 'stair': { const p = house.stairs.find(p => p.id === ref.id); return p ? `stair:${finishKey(p.finish)}` : null; }
    default: return null;
  }
}

export function materialGroup(house: House, ref: PartRef, enabled = true): PartRef[] {
  if (!partExists(house, ref)) return [];
  const key = enabled ? materialKey(house, ref) : null;
  if (!key) return [ref];
  let cache = groupCache.get(house);
  if (!cache) { cache = new Map(); groupCache.set(house, cache); }
  const cached = cache.get(key);
  if (cached) return cached;
  const parts = ref.kind === 'floor' ? house.floors : ref.kind === 'wall' ? house.walls : ref.kind === 'roof' ? house.roofs : house.stairs;
  const refs = parts.filter(p => materialKey(house, { kind: ref.kind, id: p.id }) === key).map(p => ({ kind: ref.kind, id: p.id }));
  cache.set(key, refs);
  return refs;
}

/** グリッド単位で一括移動。失敗したら元の家を維持し、履歴は呼び出し側で1回にまとめる。 */
export function moveBuildingGroup(house: House, refs: PartRef[], dx: number, dz: number): { house: House; error: string | null } {
  if (!Number.isInteger(dx) || !Number.isInteger(dz)) return { house, error: '移動は1マス単位です' };
  if (!dx && !dz) return { house, error: null };
  if (!refs.length || refs.some(r => !movableBuilding(r) || !partExists(house, r))) return { house, error: '移動する建築パーツが見つかりません' };
  const has = (kind: PartRef['kind'], id: string) => refs.some(r => r.kind === kind && r.id === id);
  const rect = <T extends { x0: number; x1: number; z0: number; z1: number }>(p: T) => ({ ...p, x0: p.x0 + dx, x1: p.x1 + dx, z0: p.z0 + dz, z1: p.z1 + dz });
  const next: House = { ...house,
    furniture: house.furniture.map(p => p.wallMount && has('wall', p.wallMount.wallId) ? { ...p, x: p.x + dx * GRID, z: p.z + dz * GRID } : p),
    floors: house.floors.map(p => has('floor', p.id) ? rect(p) : p),
    walls: house.walls.map(p => has('wall', p.id) ? rect(p) : p),
    roofs: house.roofs.map(p => has('roof', p.id) ? rect(p) : p),
    stairs: house.stairs.map(p => has('stair', p.id) ? { ...p, x: p.x + dx, z: p.z + dz } : p),
  };
  const remaining: House = { ...next,
    floors: next.floors.filter(p => !has('floor', p.id)),
    walls: next.walls.filter(p => !has('wall', p.id)),
    roofs: next.roofs.filter(p => !has('roof', p.id)),
    stairs: next.stairs.filter(p => !has('stair', p.id)),
  };
  // 支えの壁は移動後の位置で調べる。窓・ドアはwallIdとoffsetを保つだけで壁に追従する。
  for (const r of refs) {
    let error: string | null = null;
    if (r.kind === 'floor') { const p = next.floors.find(p => p.id === r.id)!; error = canPlaceFloor({ ...remaining, walls: next.walls }, p.level, p); }
    if (r.kind === 'wall') { const p = next.walls.find(p => p.id === r.id)!; error = canPlaceWall(remaining, p); }
    if (r.kind === 'roof') { const p = next.roofs.find(p => p.id === r.id)!; error = canPlaceRoof(remaining, p.level, p); }
    if (r.kind === 'stair') { const p = next.stairs.find(p => p.id === r.id)!; error = canPlaceStair(remaining, p); }
    if (error) return { house, error };
  }
  return { house: next, error: null };
}
