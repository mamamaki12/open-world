import { furnitureDef, getOpening } from '../catalog';
import { furnitureBaseY, wallDir } from './rules';
import { GRID } from './dimensions';
import type { House } from './types';

export function nearestSeat(house: House, x: number, y: number, z: number, isOpen: (id: string) => boolean = () => false) {
  let best: { id: string; x: number; y: number; z: number; yaw: number; height: number; distance: number } | null = null;
  for (const f of house.furniture) {
    const seat = f.type === 'sofa' || f.type === 'chair' ? null : furnitureDef(f).seat;
    if (f.type !== 'sofa' && f.type !== 'chair' && !seat) continue;
    const base = furnitureBaseY(house, f);
    if (Math.abs(base - y) > 0.35) continue;
    const a = f.rotation * Math.PI / 180;
    const c = Math.cos(a), s = Math.sin(a);
    const localX = (x - f.x) * c - (z - f.z) * s;
    const offset = f.type === 'sofa' ? Math.max(-0.6, Math.min(0.6, localX)) : 0;
    const forward = seat ? seat.z : f.type === 'sofa' ? 0.08 : 0;
    const sx = f.x + offset * c + forward * s;
    const sz = f.z - offset * s + forward * c;
    const distance = Math.hypot(x - sx, z - sz);
    if (distance > 1.5 || (best && distance >= best.distance)) continue;
    // 壁越し・別の部屋の家具には座れない。開いたドアだけは通せる。
    const blocked = house.walls.some((w) => {
      if (Math.abs(furnitureBaseY(house, { level: w.level, x: sx, z: sz }) - base) > 0.35) return false;
      const { dx, dz } = wallDir(w);
      const wx = w.x0 * GRID, wz = w.z0 * GRID;
      const n0 = -(x - wx) * dz + (z - wz) * dx;
      const n1 = -(sx - wx) * dz + (sz - wz) * dx;
      if (n0 * n1 >= 0) return false;
      const t = n0 / (n0 - n1);
      const along = (x + (sx - x) * t - wx) * dx + (z + (sz - z) * t - wz) * dz;
      const length = Math.hypot(w.x1 - w.x0, w.z1 - w.z0) * GRID;
      if (along < 0 || along > length) return false;
      return !house.openings.some((o) => o.wallId === w.id && o.kind === 'door' && isOpen(o.id) && Math.abs(along - o.offset) < getOpening(o.type).width / 2);
    });
    if (!blocked) best = { id: f.id, x: sx, y: base, z: sz, yaw: a + Math.PI, height: seat ? seat.height : f.type === 'sofa' ? 0.43 : 0.45, distance };
  }
  return best;
}
