import { GRID, STAIR_LENGTH, STAIR_WIDTH } from './dimensions';
import type { StairPart, StairShape } from './types';

export interface Flight { x: number; z: number; dir: number; length: number; bottom: number; top: number }
export interface Landing { x0: number; z0: number; x1: number; z1: number; height: number }
export function stairPlan(shape: StairShape = 'straight'): { flights: Flight[]; landings: Landing[] } {
  if (shape === 'l') return { flights: [
    { x: 0.5, z: 0, dir: 0, length: 2, bottom: 0, top: 0.5 },
    { x: 1, z: 2.5, dir: 1, length: 2, bottom: 0.5, top: 1 },
  ], landings: [{ x0: 0, z0: 2, x1: 1, z1: 3, height: 0.5 }] };
  if (shape === 'u') return { flights: [
    { x: 0.5, z: 0, dir: 0, length: 2, bottom: 0, top: 0.5 },
    { x: 1.5, z: 2, dir: 2, length: 2, bottom: 0.5, top: 1 },
  ], landings: [{ x0: 0, z0: 2, x1: 2, z1: 3, height: 0.5 }] };
  return { flights: [{ x: 0.5, z: 0, dir: 0, length: shape === 'compact' ? 3 : STAIR_LENGTH, bottom: 0, top: 1 }], landings: [] };
}
const direction = (dir: number) => [[0, 1], [1, 0], [0, -1], [-1, 0]][dir];
export function stairWorldGrid(s: Pick<StairPart, 'x' | 'z' | 'rot'>, x: number, z: number) {
  const a = x - 0.5, b = z - 0.5;
  const [rx, rz] = [[a, b], [b, -a], [-a, -b], [-b, a]][s.rot];
  return { x: s.x + 0.5 + rx, z: s.z + 0.5 + rz };
}
export function stairRects(s: Pick<StairPart, 'x' | 'z' | 'rot' | 'shape'>) {
  const plan = stairPlan(s.shape);
  const rects = plan.flights.map(f => {
    const [dx, dz] = direction(f.dir);
    return { x0: Math.min(f.x, f.x + dx * f.length) - Math.abs(dz) / 2,
      x1: Math.max(f.x, f.x + dx * f.length) + Math.abs(dz) / 2,
      z0: Math.min(f.z, f.z + dz * f.length) - Math.abs(dx) / 2,
      z1: Math.max(f.z, f.z + dz * f.length) + Math.abs(dx) / 2 };
  });
  return [...rects, ...plan.landings].map(r => {
    const pts = [stairWorldGrid(s, r.x0, r.z0), stairWorldGrid(s, r.x1, r.z1)];
    return { x0: Math.min(...pts.map(p => p.x)), x1: Math.max(...pts.map(p => p.x)), z0: Math.min(...pts.map(p => p.z)), z1: Math.max(...pts.map(p => p.z)) };
  });
}
export function stairHeightFraction(s: StairPart, worldX: number, worldZ: number): number | null {
  const x = worldX / GRID - s.x - 0.5, z = worldZ / GRID - s.z - 0.5;
  const [rx, rz] = [[x, z], [-z, x], [-x, -z], [z, -x]][s.rot];
  const lx = rx + 0.5, lz = rz + 0.5;
  const plan = stairPlan(s.shape);
  for (const landing of plan.landings) if (lx >= landing.x0 && lx <= landing.x1 && lz >= landing.z0 && lz <= landing.z1) return landing.height;
  for (const f of plan.flights) {
    const [dx, dz] = direction(f.dir);
    const u = (lx - f.x) * dx + (lz - f.z) * dz;
    const v = (lx - f.x) * -dz + (lz - f.z) * dx;
    if (u >= -1e-8 && u <= f.length + 1e-8 && Math.abs(v) <= 0.5 + 1e-8) return f.bottom + Math.max(0, Math.min(1, u / f.length)) * (f.top - f.bottom);
  }
  return null;
}
export function stairLocalRails(s: Pick<StairPart, 'shape' | 'rail'>) {
  const plan = stairPlan(s.shape);
  const sides = { left: [1], right: [-1], both: [1, -1], none: [] }[s.rail ?? 'left'];
  const rails = plan.flights.flatMap(f => sides.map(side => {
    const [dx, dz] = direction(f.dir), width = (STAIR_WIDTH / 2 - 0.03) / GRID;
    const ax = f.x + dz * width * side, az = f.z - dx * width * side;
    return { ax, az, bx: ax + dx * f.length, bz: az + dz * f.length, nx: dz * side, nz: -dx * side, bottom: f.bottom, top: f.top };
  }));
  if (s.rail === 'none') return rails;
  for (const l of plan.landings) {
    rails.push({ ax: l.x0 + 0.06, az: l.z0, bx: l.x0 + 0.06, bz: l.z1, nx: -1, nz: 0, bottom: l.height, top: l.height });
    rails.push({ ax: l.x0, az: l.z1 - 0.06, bx: l.x1, bz: l.z1 - 0.06, nx: 0, nz: 1, bottom: l.height, top: l.height });
    if (s.shape === 'u') rails.push({ ax: l.x1 - 0.06, az: l.z0, bx: l.x1 - 0.06, bz: l.z1, nx: 1, nz: 0, bottom: l.height, top: l.height });
  }
  return rails;
}
