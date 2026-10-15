// 配置ルール（置けるかどうかの判定、吸着、削除の連鎖）。描画からは独立させ、
// 将来サーバー側でも同じ判定を使えるようにする。
import { getFurniture, getOpening, furnitureFootprint } from '../catalog';
import { GRID, LOT_D, LOT_W, MAX_LEVEL, STAIR_LENGTH, STAIR_WIDTH, WALL_HEIGHT, WALL_THICKNESS, floorY } from './dimensions';
import type { FurniturePart, House, OpeningPart, PartRef, StairPart, StairRail, WallHeight, WallPart } from './types';

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function normalizeRect(r: Rect): Rect {
  return {
    x0: Math.min(r.x0, r.x1),
    z0: Math.min(r.z0, r.z1),
    x1: Math.max(r.x0, r.x1),
    z1: Math.max(r.z0, r.z1),
  };
}

export function rectInsideLot(r: Rect): boolean {
  return r.x0 >= 0 && r.z0 >= 0 && r.x1 <= LOT_W && r.z1 <= LOT_D && r.x1 > r.x0 && r.z1 > r.z0;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
}

// ---- 床・屋根 ----

/** 下の階の壁が、四角の中か縁にかかっているか（上の階の床・屋根を支えられるか） */
export function wallsUnder(house: House, level: number, r: Rect): boolean {
  return house.walls.some((w) => {
    // 半分の高さの壁には床も屋根も載らない
    if (w.level !== level || w.height === 'half') return false;
    const x0 = Math.min(w.x0, w.x1);
    const x1 = Math.max(w.x0, w.x1);
    const z0 = Math.min(w.z0, w.z1);
    const z1 = Math.max(w.z0, w.z1);
    // 角で点だけ接しているものは数えない
    return x0 <= r.x1 && x1 >= r.x0 && z0 <= r.z1 && z1 >= r.z0 && ((x1 > r.x0 && x0 < r.x1) || (z1 > r.z0 && z0 < r.z1));
  });
}

/** 床は地面の上（1階）か、下の階の壁の上（2階以上）に張れる */
export function canPlaceFloor(house: House, level: number, r: Rect): string | null {
  if (!rectInsideLot(r)) return '土地の外には置けません';
  if (house.floors.some((f) => f.level === level && rectsOverlap(f, r))) return 'すでに床があります';
  if (level > 0 && !wallsUnder(house, level - 1, r)) return '床は地面の上か、壁の上に張れます';
  return null;
}

export function canPlaceRoof(house: House, level: number, r: Rect): string | null {
  if (!rectInsideLot(r)) return '土地の外には置けません';
  if (house.roofs.some((f) => f.level === level && rectsOverlap(f, r))) return 'すでに屋根があります';
  return null;
}

// ---- 壁 ----

/** 壁の高さ（m） */
export function wallHeight(w: Pick<WallPart, 'height'>): number {
  return w.height === 'half' ? WALL_HEIGHT / 2 : WALL_HEIGHT;
}

/** 壁の高さを変えたときに、付いている窓・ドアが収まるか */
export function canChangeWallHeight(house: House, wallId: string, height: WallHeight): string | null {
  const top = wallHeight({ height }) - 0.05;
  const tooTall = house.openings.some((o) => {
    if (o.wallId !== wallId) return false;
    const d = getOpening(o.type);
    return d.sill + d.height > top;
  });
  return tooTall ? '付いている窓・ドアが収まりません' : null;
}

export function wallLength(w: Pick<WallPart, 'x0' | 'z0' | 'x1' | 'z1'>): number {
  return Math.hypot(w.x1 - w.x0, w.z1 - w.z0) * GRID;
}

/** 壁の向き（単位ベクトル、ワールド座標） */
export function wallDir(w: Pick<WallPart, 'x0' | 'z0' | 'x1' | 'z1'>): { dx: number; dz: number } {
  const len = Math.hypot(w.x1 - w.x0, w.z1 - w.z0);
  return { dx: (w.x1 - w.x0) / len, dz: (w.z1 - w.z0) / len };
}

/** ドラッグの始点・終点から、x方向かz方向のどちらかに揃えた壁の線を作る */
export function axisAlignedSegment(
  a: { x: number; z: number },
  b: { x: number; z: number },
): { x0: number; z0: number; x1: number; z1: number } {
  if (Math.abs(b.x - a.x) >= Math.abs(b.z - a.z)) {
    return { x0: a.x, z0: a.z, x1: b.x, z1: a.z };
  }
  return { x0: a.x, z0: a.z, x1: a.x, z1: b.z };
}

function segmentRange(w: Pick<WallPart, 'x0' | 'z0' | 'x1' | 'z1'>) {
  const horizontal = w.z0 === w.z1;
  return horizontal
    ? { horizontal, line: w.z0, lo: Math.min(w.x0, w.x1), hi: Math.max(w.x0, w.x1) }
    : { horizontal, line: w.x0, lo: Math.min(w.z0, w.z1), hi: Math.max(w.z0, w.z1) };
}

export function wallsOverlap(
  a: Pick<WallPart, 'x0' | 'z0' | 'x1' | 'z1'>,
  b: Pick<WallPart, 'x0' | 'z0' | 'x1' | 'z1'>,
): boolean {
  const ra = segmentRange(a);
  const rb = segmentRange(b);
  if (ra.horizontal !== rb.horizontal || ra.line !== rb.line) return false;
  return ra.lo < rb.hi && rb.lo < ra.hi;
}

export function canPlaceWall(
  house: House,
  w: Pick<WallPart, 'level' | 'x0' | 'z0' | 'x1' | 'z1'>,
): string | null {
  if (w.x0 !== w.x1 && w.z0 !== w.z1) return '壁は縦か横にまっすぐ引いてください';
  if (w.x0 === w.x1 && w.z0 === w.z1) return '壁の長さが0です';
  const pts = [w.x0, w.x1].every((x) => x >= 0 && x <= LOT_W) && [w.z0, w.z1].every((z) => z >= 0 && z <= LOT_D);
  if (!pts) return '土地の外には建てられません';
  if (house.walls.some((o) => o.level === w.level && wallsOverlap(o, w))) return 'すでに壁があります';
  return null;
}

/** その階のその地点（m）が床で覆われているか */
export function floorCovers(house: House, level: number, x: number, z: number, roomsOnly = false): boolean {
  const gx = x / GRID;
  const gz = z / GRID;
  return house.floors.some(
    (f) => f.level === level && !(roomsOnly && f.kind === 'terrace') && gx > f.x0 && gx < f.x1 && gz > f.z0 && gz < f.z1,
  );
}

/** 家具を置く高さ：その階の床の上。1階で床のない所（庭）なら地面 */
export function furnitureBaseY(house: House, f: Pick<FurniturePart, 'level' | 'x' | 'z'>): number {
  if (f.level > 0 || floorCovers(house, 0, f.x, f.z)) return floorY(f.level);
  return 0;
}

/**
 * 壁のどちら側が屋外か。+1: 左側（進行方向に対して左＝ローカル+Z）が屋外、-1: 右側が屋外、
 * 0: 両側とも室内（間仕切り）、2: 両側とも屋外（塀のような壁）
 */
export function wallOutsideSide(house: House, w: WallPart): 1 | -1 | 0 | 2 {
  const { dx, dz } = wallDir(w);
  const mx = ((w.x0 + w.x1) / 2) * GRID;
  const mz = ((w.z0 + w.z1) / 2) * GRID;
  const probe = GRID / 2;
  // 左法線 (-dz, dx)
  // テラスの側は屋外として扱う
  const leftIn = floorCovers(house, w.level, mx - dz * probe, mz + dx * probe, true);
  const rightIn = floorCovers(house, w.level, mx + dz * probe, mz - dx * probe, true);
  if (leftIn && rightIn) return 0;
  if (leftIn) return -1;
  if (rightIn) return 1;
  return 2;
}

// ---- 窓・ドア ----

/** 開口の中心位置を半マス（455mm）単位に吸着する */
export function snapOpeningOffset(wallLen: number, raw: number, width: number): number {
  const step = GRID / 2;
  let snapped = Math.round(raw / step) * step;
  // 開口の幅が半マスの奇数倍に近い場合でも端からはみ出さないよう範囲に収める
  const min = width / 2 + 0.05;
  const max = wallLen - width / 2 - 0.05;
  if (snapped < min) snapped = min;
  if (snapped > max) snapped = max;
  return snapped;
}

export function canPlaceOpening(
  house: House,
  wallId: string,
  typeId: string,
  offset: number,
  ignoreId?: string,
): string | null {
  const wall = house.walls.find((w) => w.id === wallId);
  if (!wall) return '壁が見つかりません';
  const def = getOpening(typeId);
  const len = wallLength(wall);
  const lo = offset - def.width / 2;
  const hi = offset + def.width / 2;
  if (lo < 0.04 || hi > len - 0.04) return '壁に収まりません（壁を長くしてください）';
  if (def.sill + def.height > wallHeight(wall) - 0.05) return '壁が低くて収まりません';
  for (const o of house.openings) {
    if (o.wallId !== wallId || o.id === ignoreId) continue;
    const od = getOpening(o.type);
    const olo = o.offset - od.width / 2;
    const ohi = o.offset + od.width / 2;
    if (lo < ohi + 0.08 && olo < hi + 0.08) return '他の窓・ドアと重なります';
  }
  return null;
}

// ---- 階段 ----

/** 階段の占めるマス（グリッド点の四角形） */
export function stairFootprint(s: Pick<StairPart, 'x' | 'z' | 'rot'>): Rect {
  switch (s.rot) {
    case 0:
      return { x0: s.x, z0: s.z, x1: s.x + 1, z1: s.z + STAIR_LENGTH };
    case 2:
      return { x0: s.x, z0: s.z - STAIR_LENGTH + 1, x1: s.x + 1, z1: s.z + 1 };
    case 1:
      return { x0: s.x, z0: s.z, x1: s.x + STAIR_LENGTH, z1: s.z + 1 };
    case 3:
      return { x0: s.x - STAIR_LENGTH + 1, z0: s.z, x1: s.x + 1, z1: s.z + 1 };
  }
}

/** 手すりの位置（階段ローカルの X。上る向き +Z に見て左が +X）。両側なら2本、なしなら空 */
export function stairRailXs(rail: StairRail = 'left'): number[] {
  const x = STAIR_WIDTH / 2 - 0.03;
  return { left: [x], right: [-x], both: [x, -x], none: [] }[rail];
}

export function canPlaceStair(house: House, s: Omit<StairPart, 'id' | 'finish'>, ignoreId?: string): string | null {
  if (s.level >= MAX_LEVEL) return 'この階より上には階段を架けられません';
  const fp = stairFootprint(s);
  if (!rectInsideLot(fp)) return '土地の外には置けません';
  const clash = house.stairs.some(
    (o) => o.id !== ignoreId && (o.level === s.level || Math.abs(o.level - s.level) === 1) && rectsOverlap(stairFootprint(o), fp),
  );
  if (clash) return '他の階段と重なります';
  return null;
}

/** その階の床に開ける吹き抜け（下の階から上がってくる階段の穴） */
export function stairHoles(house: House, level: number): Rect[] {
  return house.stairs.filter((s) => s.level === level - 1).map(stairFootprint);
}

// ---- 家具 ----

/** 家具の位置を5cm単位に吸着し、土地の中に収める */
export function snapFurniture(x: number, z: number): { x: number; z: number } {
  const s = 0.05;
  const cx = Math.min(Math.max(Math.round(x / s) * s, 0), LOT_W * GRID);
  const cz = Math.min(Math.max(Math.round(z / s) * s, 0), LOT_D * GRID);
  return { x: +cx.toFixed(3), z: +cz.toFixed(3) };
}

export function furnitureRadius(type: string): number {
  const fp = furnitureFootprint(getFurniture(type));
  return Math.hypot(fp.w, fp.d) / 2;
}

// ---- 削除 ----

/** パーツを消す。壁を消すとその壁の窓・ドアも消える */
export function removePart(house: House, ref: PartRef): House {
  switch (ref.kind) {
    case 'floor':
      return { ...house, floors: house.floors.filter((p) => p.id !== ref.id) };
    case 'wall':
      return {
        ...house,
        walls: house.walls.filter((p) => p.id !== ref.id),
        openings: house.openings.filter((o) => o.wallId !== ref.id),
      };
    case 'opening':
      return { ...house, openings: house.openings.filter((p) => p.id !== ref.id) };
    case 'stair':
      return { ...house, stairs: house.stairs.filter((p) => p.id !== ref.id) };
    case 'roof':
      return { ...house, roofs: house.roofs.filter((p) => p.id !== ref.id) };
    case 'furniture':
      return { ...house, furniture: house.furniture.filter((p) => p.id !== ref.id) };
  }
}

export function partExists(house: House, ref: PartRef): boolean {
  const list = {
    floor: house.floors,
    wall: house.walls,
    opening: house.openings,
    stair: house.stairs,
    roof: house.roofs,
    furniture: house.furniture,
  }[ref.kind] as { id: string }[];
  return list.some((p) => p.id === ref.id);
}

/** 窓・ドアの壁上の範囲（m） */
export function openingSpan(o: OpeningPart): { lo: number; hi: number } {
  const def = getOpening(o.type);
  return { lo: o.offset - def.width / 2, hi: o.offset + def.width / 2 };
}

export const HALF_WALL = WALL_THICKNESS / 2;
