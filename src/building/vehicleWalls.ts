import { getOpening } from '../catalog';
import type { CarDef } from '../catalog/cars';
import { GRID, WALL_THICKNESS } from './dimensions';
import type { DrivePose } from './driving';
import { wallBaseY, wallHeight, wallLength } from './rules';
import type { House, OpeningPart } from './types';

// 家の編集でHouseが置き換わるため、壁ごとの開口を共有して衝突の小刻みな再計算を軽くする。
const openingCache = new WeakMap<House, { source: OpeningPart[]; count: number; byWall: Map<string, OpeningPart[]> }>();
function openingsByWall(house: House) {
  const cached = openingCache.get(house);
  if (cached && cached.source === house.openings && cached.count === house.openings.length) return cached.byWall;
  const byWall = new Map<string, OpeningPart[]>();
  for (const o of house.openings) {
    const list = byWall.get(o.wallId);
    if (list) list.push(o); else byWall.set(o.wallId, [o]);
  }
  openingCache.set(house, { source: house.openings, count: house.openings.length, byWall });
  return byWall;
}

/** 線分と車体ローカルの矩形。壁の端が四隅に触れる場合も含める。 */
function hitsBox(ax: number, az: number, bx: number, bz: number, halfW: number, halfL: number): boolean {
  let enter = 0, leave = 1;
  for (const [a, b, half] of [[ax, bx, halfW], [az, bz, halfL]]) {
    const delta = b - a;
    if (Math.abs(delta) < 1e-10) {
      if (Math.abs(a) > half) return false;
    } else {
      const t0 = (-half - a) / delta, t1 = (half - a) / delta;
      enter = Math.max(enter, Math.min(t0, t1));
      leave = Math.min(leave, Math.max(t0, t1));
      if (enter > leave) return false;
    }
  }
  return true;
}

/** 車体全体（向き付き矩形）と壁。houseOffset は家の原点のワールド座標(m)。 */
export function carHitsWalls(
  car: Pick<DrivePose, 'x' | 'z' | 'yaw'>, def: Pick<CarDef, 'width' | 'length' | 'height'>,
  house: House, isOpen: (id: string) => boolean = () => false, houseOffset = { x: 0, z: 0 },
): boolean {
  const cos = Math.cos(car.yaw), sin = Math.sin(car.yaw);
  const margin = WALL_THICKNESS / 2 + 0.04;
  const halfW = def.width / 2 + margin, halfL = def.length / 2 + margin;
  const local = (x: number, z: number) => {
    const dx = x + houseOffset.x - car.x, dz = z + houseOffset.z - car.z;
    return { x: dx * cos - dz * sin, z: dx * sin + dz * cos };
  };
  const byWall = openingsByWall(house);
  for (const wall of house.walls) {
    const bottom = wallBaseY(wall), top = bottom + wallHeight(wall);
    if (bottom >= def.height || top <= 0) continue;
    const length = wallLength(wall);
    if (length <= 0) continue;
    const dx = (wall.x1 - wall.x0) * GRID / length, dz = (wall.z1 - wall.z0) * GRID / length;
    // 車体の高さまで開いている建具だけ通れる。腰高窓・閉じたドアは壁として扱う。
    const gaps = (byWall.get(wall.id) ?? []).filter(o => isOpen(o.id)).flatMap(o => {
      const d = getOpening(o.type);
      if (bottom + d.sill > Math.max(0, bottom) + 1e-6 || bottom + d.sill + d.height < Math.min(def.height, top) - 1e-6) return [];
      return [{ lo: Math.max(0, o.offset - d.width / 2), hi: Math.min(length, o.offset + d.width / 2) }];
    }).sort((a, b) => a.lo - b.lo);
    const segment = (lo: number, hi: number) => {
      const a = local(wall.x0 * GRID + dx * lo, wall.z0 * GRID + dz * lo);
      const b = local(wall.x0 * GRID + dx * hi, wall.z0 * GRID + dz * hi);
      return hitsBox(a.x, a.z, b.x, b.z, halfW, halfL);
    };
    let start = 0;
    for (const gap of gaps) {
      if (gap.lo > start && segment(start, gap.lo)) return true;
      start = Math.max(start, gap.hi);
    }
    if (start < length && segment(start, length)) return true;
  }
  return false;
}

/** 施設の直方体と車体の矩形。4軸の分離軸判定で斜めの四隅も保護する。 */
export function carHitsBox(
  car: Pick<DrivePose, 'x' | 'z' | 'yaw'>, def: Pick<CarDef, 'width' | 'length'>,
  box: { x0: number; x1: number; z0: number; z1: number }, offset = { x: 0, z: 0 },
): boolean {
  const cos = Math.cos(car.yaw), sin = Math.sin(car.yaw);
  const halfW = def.width / 2 + .04, halfL = def.length / 2 + .04;
  const bx = (box.x1 - box.x0) / 2, bz = (box.z1 - box.z0) / 2;
  const dx = (box.x0 + box.x1) / 2 + offset.x - car.x;
  const dz = (box.z0 + box.z1) / 2 + offset.z - car.z;
  for (const [ax, az] of [[1, 0], [0, 1], [cos, -sin], [sin, cos]]) {
    const carRadius = halfW * Math.abs(ax * cos - az * sin) + halfL * Math.abs(ax * sin + az * cos);
    const boxRadius = bx * Math.abs(ax) + bz * Math.abs(az);
    if (Math.abs(dx * ax + dz * az) > carRadius + boxRadius) return false;
  }
  return true;
}
