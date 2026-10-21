// 配置ルール（置けるかどうかの判定、吸着、削除の連鎖）。描画からは独立させ、
// 将来サーバー側でも同じ判定を使えるようにする。
import { stairRects } from './stairs';
import { getFurniture, getOpening, furnitureDef, furnitureFootprint } from '../catalog';
import type { FurnitureDef } from '../catalog';
import { GRID, lotSize, MAX_LEVEL, STAIR_WIDTH, WALL_HEIGHT, WALL_THICKNESS, floorY } from './dimensions';
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
  return r.x0 >= 0 && r.z0 >= 0 && r.x1 <= lotSize.w && r.z1 <= lotSize.d && r.x1 > r.x0 && r.z1 > r.z0;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
}

// ---- 床・屋根 ----

/** 下の階の壁が、四角の中か縁にかかっているか（上の階の床・屋根を支えられるか） */
export function wallsUnder(house: House, level: number, r: Rect): boolean {
  return house.walls.some((w) => {
    // 半分の高さの壁には床も屋根も載らない
    if (w.level !== level || (w.height && w.height !== 'full')) return false;
    const x0 = Math.min(w.x0, w.x1);
    const x1 = Math.max(w.x0, w.x1);
    const z0 = Math.min(w.z0, w.z1);
    const z1 = Math.max(w.z0, w.z1);
    // 角で点だけ接しているものは数えない
    return x0 <= r.x1 && x1 >= r.x0 && z0 <= r.z1 && z1 >= r.z0 && ((x1 > r.x0 && x0 < r.x1) || (z1 > r.z0 && z0 < r.z1));
  });
}

/** 角だけでなく、辺が正の長さで接している。 */
export function floorEdgesTouch(a: Rect, b: Rect): boolean {
  return ((a.x1 === b.x0 || b.x1 === a.x0) && Math.min(a.z1, b.z1) > Math.max(a.z0, b.z0)) ||
    ((a.z1 === b.z0 || b.z1 === a.z0) && Math.min(a.x1, b.x1) > Math.max(a.x0, b.x0));
}

/** 同じ階の床をたどり、直下の全高壁につながっているか。循環だけでは支持にならない。 */
function floorSupported(house: House, level: number, r: Rect): boolean {
  const pending: Rect[] = [r];
  const remaining = new Set(house.floors.filter(f => f.level === level));
  for (let i = 0; i < pending.length; i++) {
    const current = pending[i];
    if (wallsUnder(house, level - 1, current)) return true;
    for (const floor of remaining) {
      if (!floorEdgesTouch(current, floor)) continue;
      remaining.delete(floor);
      pending.push(floor);
    }
  }
  return false;
}

/** 床は地面、全高壁の上、またはその壁に支えられた同じ階の床の隣に張れる。 */
export function canPlaceFloor(house: House, level: number, r: Rect): string | null {
  if (!rectInsideLot(r)) return '土地の外には置けません';
  if (house.floors.some((f) => f.level === level && rectsOverlap(f, r))) return 'すでに床があります';
  if (level > 0 && !floorSupported(house, level, r)) return '床は地面・壁の上か、壁に支えられた同じ階の床につなげて張れます';
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
  return w.height === 'fence' ? 1.2 : w.height === 'privacyFence' ? 1.8 : w.height === 'half' ? WALL_HEIGHT / 2 : WALL_HEIGHT;
}

/** 外構の塀は基礎の高さを足さず、地面から立てる。 */
export function wallBaseY(w: Pick<WallPart, 'level' | 'height'>): number {
  return w.height === 'fence' || w.height === 'privacyFence' ? 0 : floorY(w.level);
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
  const pts = [w.x0, w.x1].every((x) => x >= 0 && x <= lotSize.w) && [w.z0, w.z1].every((z) => z >= 0 && z <= lotSize.d);
  if (!pts) return '土地の外には建てられません';
  if (house.walls.some((o) => o.level === w.level && wallsOverlap(o, w))) return 'すでに壁があります';
  return null;
}

/** その階のその地点（m）が床で覆われているか */
export function floorCovers(house: House, level: number, x: number, z: number, roomsOnly = false): boolean {
  const gx = x / GRID;
  const gz = z / GRID;
  return house.floors.some(
      (f) => f.level === level && !(roomsOnly && f.kind === 'terrace') && gx >= f.x0 && gx < f.x1 && gz >= f.z0 && gz < f.z1,
  );
}

/** 家具を置く高さ：その階の床の上。1階で床のない所（庭）なら地面 */
export function furnitureBaseY(house: House, f: Pick<FurniturePart, 'level' | 'x' | 'z'> & { type?: string; design?: FurnitureDef }): number {
  if (f.type && furnitureDef(f).ceiling) return floorY(f.level) + WALL_HEIGHT - .035;
  if (f.type && furnitureDef(f).grounded) return 0;
  if (f.level > 0 || floorCovers(house, 0, f.x, f.z)) return floorY(f.level);
  return 0;
}

/**
 * その階で壁に囲まれたマス（家の中）。土地の外から壁（高さのあるもの）を越えずにたどり着けないマスを 1 にする。
 * 家は作り直すたびに新しいオブジェクトになるので、家ごとに覚えておく
 */
const enclosedCache = new WeakMap<House, Map<string, Uint8Array>>();
function enclosedCells(house: House, level: number): Uint8Array {
  let byLevel = enclosedCache.get(house);
  if (!byLevel) enclosedCache.set(house, (byLevel = new Map()));
  const LOT_W = lotSize.w;
  const LOT_D = lotSize.d;
  const key = `${level}:${LOT_W}x${LOT_D}`;
  const hit = byLevel.get(key);
  if (hit) return hit;
  // 土地の周りに1マスの余白を付けた格子で、外側から塗りつぶす
  const W = LOT_W + 2;
  const D = LOT_D + 2;
  const idx = (x: number, z: number) => (z + 1) * W + (x + 1);
  // 縦の線 x=k の z..z+1 をふさぐ壁、横の線 z=k の x..x+1 をふさぐ壁
  const vBlock = new Set<number>();
  const hBlock = new Set<number>();
  for (const w of house.walls) {
    if (w.level !== level || wallHeight(w) !== WALL_HEIGHT) continue;
    if (w.x0 === w.x1) for (let z = Math.min(w.z0, w.z1); z < Math.max(w.z0, w.z1); z++) vBlock.add(idx(w.x0, z));
    else for (let x = Math.min(w.x0, w.x1); x < Math.max(w.x0, w.x1); x++) hBlock.add(idx(x, w.z0));
  }
  const seen = new Uint8Array(W * D);
  const stack = [idx(-1, -1)];
  seen[stack[0]] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    const x = (i % W) - 1;
    const z = Math.floor(i / W) - 1;
    const go = (nx: number, nz: number, blocked: boolean) => {
      if (blocked || nx < -1 || nz < -1 || nx > LOT_W || nz > LOT_D) return;
      const j = idx(nx, nz);
      if (!seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    };
    go(x + 1, z, vBlock.has(idx(x + 1, z)));
    go(x - 1, z, vBlock.has(idx(x, z)));
    go(x, z + 1, hBlock.has(idx(x, z + 1)));
    go(x, z - 1, hBlock.has(idx(x, z)));
  }
  const out = new Uint8Array(LOT_W * LOT_D);
  for (let z = 0; z < LOT_D; z++) for (let x = 0; x < LOT_W; x++) if (!seen[idx(x, z)]) out[z * LOT_W + x] = 1;
  byLevel.set(key, out);
  return out;
}

/**
 * 壁のどちら側が屋外か。+1: 左側（進行方向に対して左＝ローカル+Z）が屋外、-1: 右側が屋外、
 * 0: 両側とも室内（間仕切り）、2: 両側とも屋外（塀のような壁）。
 * 壁で囲まれた部屋があれば、その内側を室内とする（床が壁の外まではみ出していても外壁は外壁）。
 * まだ囲まれていない作りかけの家では、床のある側を室内とする
 */
export function wallOutsideSide(house: House, w: WallPart): 1 | -1 | 0 | 2 {
  if (w.height === 'fence' || w.height === 'privacyFence') return 2;
  const { dx, dz } = wallDir(w);
  const probe = GRID / 2;
  const len = Math.round(Math.hypot(w.x1 - w.x0, w.z1 - w.z0));
  const enclosed = enclosedCells(house, w.level);
  // 囲まれていても、テラスの上は屋外
  const inside = (x: number, z: number) => {
    const cx = Math.floor(x / GRID);
    const cz = Math.floor(z / GRID);
    if (cx < 0 || cz < 0 || cx >= lotSize.w || cz >= lotSize.d || !enclosed[cz * lotSize.w + cx]) return false;
    return !house.floors.some((f) => f.level === w.level && f.kind === 'terrace' && cx >= f.x0 && cx < f.x1 && cz >= f.z0 && cz < f.z1);
  };
  let leftIn = false;
  let rightIn = false;
  // 壁に沿って1マスずつ、左右のマスを調べる（左法線 (-dz, dx)）
  for (let i = 0; i < len; i++) {
    const mx = (w.x0 + dx * (i + 0.5)) * GRID;
    const mz = (w.z0 + dz * (i + 0.5)) * GRID;
    leftIn ||= inside(mx - dz * probe, mz + dx * probe);
    rightIn ||= inside(mx + dz * probe, mz - dx * probe);
  }
  if (!leftIn && !rightIn) {
    // テラスの側は屋外として扱う
    const mx = ((w.x0 + w.x1) / 2) * GRID;
    const mz = ((w.z0 + w.z1) / 2) * GRID;
    leftIn = floorCovers(house, w.level, mx - dz * probe, mz + dx * probe, true);
    rightIn = floorCovers(house, w.level, mx + dz * probe, mz - dx * probe, true);
  }
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
export function stairFootprint(s: Pick<StairPart, 'x' | 'z' | 'rot' | 'shape'>): Rect {
  const rects = stairRects(s);
  return { x0: Math.min(...rects.map(r => r.x0)), x1: Math.max(...rects.map(r => r.x1)),
    z0: Math.min(...rects.map(r => r.z0)), z1: Math.max(...rects.map(r => r.z1)) };
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
  // 折り返し（U字）階段は上り口と上がった先が同じ側にあるので、階段室として各階の同じ位置に積み重ねられる
  const stacked = (o: Omit<StairPart, 'id' | 'finish'>) =>
    Math.abs(o.level - s.level) === 1 && o.shape === 'u' && s.shape === 'u' && o.x === s.x && o.z === s.z && o.rot === s.rot;
  const clash = house.stairs.some(
    (o) => o.id !== ignoreId && (o.level === s.level || Math.abs(o.level - s.level) === 1) && !stacked(o) && stairRects(o).some(a => stairRects(s).some(b => rectsOverlap(a, b))),
  );
  if (clash) return '他の階段と重なります';
  return null;
}

/** その階の床に開ける吹き抜け（下の階から上がってくる階段の穴） */
export function stairHoles(house: House, level: number): Rect[] {
  return house.stairs.filter((s) => s.level === level - 1).flatMap(stairRects);
}

// ---- 家具 ----

/** 家具の位置を5cm単位に吸着し、土地の中に収める */
export function snapFurniture(x: number, z: number): { x: number; z: number } {
  const s = 0.05;
  const cx = Math.min(Math.max(Math.round(x / s) * s, 0), lotSize.w * GRID);
  const cz = Math.min(Math.max(Math.round(z / s) * s, 0), lotSize.d * GRID);
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
        furniture: house.furniture.filter((f) => f.wallMount?.wallId !== ref.id),
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

/** パーツをまとめて消す（1回の取り消しで戻せるよう、呼ぶ側で1回だけ commit する） */
export function removeParts(house: House, refs: PartRef[]): House {
  return refs.reduce((h, r) => removePart(h, r), house);
}

/**
 * 上から見て四角い範囲（グリッド座標）にかかるパーツ。どの階のものも含む。
 * 床・屋根・階段は範囲と重なるもの、壁は範囲にかかるもの、窓・ドア・家具は中心が範囲に入るもの
 */
export function partsInRect(house: House, r: Rect): PartRef[] {
  const inside = (gx: number, gz: number) => gx >= r.x0 && gx <= r.x1 && gz >= r.z0 && gz <= r.z1;
  const refs: PartRef[] = [];
  for (const f of house.floors) if (rectsOverlap(f, r)) refs.push({ kind: 'floor', id: f.id });
  for (const w of house.walls) {
    const x0 = Math.min(w.x0, w.x1);
    const x1 = Math.max(w.x0, w.x1);
    const z0 = Math.min(w.z0, w.z1);
    const z1 = Math.max(w.z0, w.z1);
    if (x0 <= r.x1 && x1 >= r.x0 && z0 <= r.z1 && z1 >= r.z0) refs.push({ kind: 'wall', id: w.id });
  }
  for (const o of house.openings) {
    const w = house.walls.find((ww) => ww.id === o.wallId);
    if (!w) continue;
    const { dx, dz } = wallDir(w);
    if (inside(w.x0 + (dx * o.offset) / GRID, w.z0 + (dz * o.offset) / GRID)) refs.push({ kind: 'opening', id: o.id });
  }
  for (const s of house.stairs) if (rectsOverlap(stairFootprint(s), r)) refs.push({ kind: 'stair', id: s.id });
  for (const rf of house.roofs) if (rectsOverlap(rf, r)) refs.push({ kind: 'roof', id: rf.id });
  for (const f of house.furniture) if (inside(f.x / GRID, f.z / GRID)) refs.push({ kind: 'furniture', id: f.id });
  return refs;
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

