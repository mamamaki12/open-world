// みんなのワールドに入ったときの車の置き場所。ログアウト中の車はワールドに出さないので、
// 入り直したら自分の土地の前の道路（土地がなければ車屋の横の駐車場）に置き直す。
import { GRID, LOT_D, LOT_W } from '../building/dimensions';
import { DEALER_BAYS } from '../building/dealer';
import { CIVIC_SITE, TOWN_ROADS, plotX, plotZ } from '../economy/town';

interface Spot { x: number; z: number; yaw: number }
interface OwnLot { plot?: number; joined?: number }
const LOT_WIDTH = LOT_W * GRID, LOT_DEPTH = LOT_D * GRID;
/** 車1台ぶんの間隔（いちばん長い車でも前後に余裕がある） */
const PITCH = 6.2;
/** 東向き（日本の左側通行で、道路の北側の車線） */
const EAST = -Math.PI / 2;

/** 区画の正面（南側）の道路。土地の南の端に接している東西の道路 */
export function frontRoad(plot: number) {
  const south = plotZ(plot) + LOT_DEPTH;
  return TOWN_ROADS.find(r => r.x1 - r.x0 > r.z1 - r.z0 && r.z0 > south - .5 && r.z0 < south + 1) ?? null;
}

/** 土地の前の道路に車を縦に並べる場所（西から東へ） */
export function lotFrontSpots(lot: OwnLot): Spot[] {
  if (typeof lot.plot !== 'number') return [];
  const road = frontRoad(lot.plot); if (!road) return [];
  const walk = road.z1 - road.z0 >= 9 ? 1.7 : 1.1;
  const x0 = plotX(lot.plot), x1 = (typeof lot.joined === 'number' ? plotX(lot.joined) : x0) + LOT_WIDTH;
  const n = Math.max(1, Math.floor((x1 - x0) / PITCH)), start = (x0 + x1) / 2 - (n - 1) * PITCH / 2;
  return Array.from({ length: n }, (_, i) => ({ x: start + i * PITCH, z: road.z0 + walk + 1.3, yaw: EAST }));
}

/** 車屋の横の駐車場の区画（町の座標） */
export function dealerSpots(): Spot[] {
  return DEALER_BAYS.map(b => ({ x: CIVIC_SITE.x + b.x, z: CIVIC_SITE.z + b.z, yaw: b.yaw }));
}

/**
 * 持ち主が入ったときの車の置き場所。自分の土地の前を先に埋め、残りは車屋の駐車場へ。
 * taken はほかの人の車の位置で、近くには置かない。置けない車は元の場所のまま。
 */
export function spawnCars<T extends Spot>(cars: T[], lots: OwnLot[], taken: { x: number; z: number }[] = []): T[] {
  const used = [...taken];
  const spots = [...lots.flatMap(lotFrontSpots), ...dealerSpots()];
  return cars.map(car => {
    const spot = spots.find(s => used.every(u => Math.hypot(u.x - s.x, u.z - s.z) > 2.4));
    if (!spot) return car;
    used.push(spot);
    return { ...car, x: spot.x, z: spot.z, yaw: spot.yaw };
  });
}
