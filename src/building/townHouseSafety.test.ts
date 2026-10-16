import { describe, expect, it } from 'vitest';
import { GRID, LOT_D, LOT_W, STORY_HEIGHT, floorY } from './dimensions';
import { TOWN_HOUSE_DESIGNS } from './townHouses';
import { stairPlan, stairWorldGrid } from './stairs';
import { PLAYER, ceilingHeight, resolveCollisions, roofBlocks, surfaceHeight } from './walk';
import { stairHoles } from './rules';

describe('デフォルト住宅の通行と転落防止', () => {
  for (const design of TOWN_HOUSE_DESIGNS) {
    it(design.id + ': 全階段を立ったまま上下できる', () => {
      const h = design.build();
      for (const s of h.stairs) {
        const plan = stairPlan(s.shape);
        const points: { x: number; z: number; y: number }[] = [];
        const point = (x: number, z: number, fraction: number) => {
          const p = stairWorldGrid(s, x, z);
          return { x: p.x * GRID, z: p.z * GRID, y: floorY(s.level) + fraction * STORY_HEIGHT };
        };
        const first = plan.flights[0], last = plan.flights[plan.flights.length - 1];
        const dir = (n: number) => [[0, 1], [1, 0], [0, -1], [-1, 0]][n];
        const [fx, fz] = dir(first.dir), [lx, lz] = dir(last.dir);
        points.push(point(first.x - fx * 0.6, first.z - fz * 0.6, 0));
        for (let n = 0; n < plan.flights.length; n++) {
          const f = plan.flights[n], [dx, dz] = dir(f.dir);
          for (let i = 0; i <= 80; i++) {
            const u = i / 80;
            points.push(point(f.x + dx * f.length * u, f.z + dz * f.length * u, f.bottom + (f.top - f.bottom) * u));
          }
          if (n < plan.flights.length - 1) {
            // U字階段の踊り場は、端まで進んでから横断して折り返す。
            const next = plan.flights[n + 1];
            const a = { x: f.x + dx * (f.length + 0.5), z: f.z + dz * (f.length + 0.5) };
            const [nx, nz] = dir(next.dir);
            const b = { x: next.x - nx * 0.5, z: next.z - nz * 0.5 };
            points.push(point(a.x, a.z, f.top));
            for (let i = 1; i <= 20; i++) points.push(point(a.x + (b.x - a.x) * i / 20, a.z + (b.z - a.z) * i / 20, f.top));
          }
        }
        points.push(point(last.x + lx * (last.length + 0.6), last.z + lz * (last.length + 0.6), 1));
        for (const route of [points, [...points].reverse()]) {
          let y = route[0].y;
          for (const p of route) {
            const label = design.id + ' ' + s.id + ' at ' + p.x.toFixed(2) + ',' + p.z.toFixed(2);
            const pos = resolveCollisions(h, p, p.y, PLAYER.height);
            expect(Math.hypot(pos.x - p.x, pos.z - p.z), label + ' 衝突').toBeLessThan(0.03);
            const surface = surfaceHeight(h, p.x, p.z, y);
            expect(surface, label + ' 床').toBeCloseTo(p.y, 3);
            expect(ceilingHeight(h, p.x, p.z, p.y) - p.y, label + ' 天井').toBeGreaterThanOrEqual(PLAYER.height - 0.05);
            expect(roofBlocks(h, p.x, p.z, p.y, PLAYER.height), label + ' 屋根').toBe(false);
            y = surface;
          }
        }
      }
    });

    it(design.id + ': 上階の床端は壁か階段への出入口で保護される', () => {
      const h = design.build();
      for (const level of new Set(h.floors.map(f => f.level))) {
        if (!level) continue;
        const holes = stairHoles(h, level);
        const floor = (x: number, z: number) => h.floors.some(f => f.level === level && x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) &&
          !holes.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
        for (let z = 0; z < LOT_D; z++) for (let x = 0; x < LOT_W; x++) {
          if (!floor(x + 0.5, z + 0.5)) continue;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (floor(x + 0.5 + dx, z + 0.5 + dz)) continue;
            const ex = x + 0.5 + dx / 2, ez = z + 0.5 + dz / 2;
            const wall = h.walls.some(w => w.level === level &&
              (dx ? w.x0 === ex && w.x1 === ex && ez > Math.min(w.z0, w.z1) && ez < Math.max(w.z0, w.z1) :
                w.z0 === ez && w.z1 === ez && ex > Math.min(w.x0, w.x1) && ex < Math.max(w.x0, w.x1)));
            const stairEntry = h.stairs.some(s => {
              const flights = stairPlan(s.shape).flights;
              const f = s.level === level ? flights[0] : s.level === level - 1 ? flights[flights.length - 1] : null;
              if (!f) return false;
              const [sx, sz] = [[0, 1], [1, 0], [0, -1], [-1, 0]][f.dir];
              const dist = s.level === level ? 0 : f.length;
              const p = stairWorldGrid(s, f.x + sx * dist, f.z + sz * dist);
              return Math.hypot(ex - p.x, ez - p.z) < 0.01;
            });
            expect(wall || stairEntry, design.id + ' ' + level + ': ' + ex + ',' + ez).toBe(true);
          }
        }
      }
      expect(h.stairs.every(s => s.rail === 'both')).toBe(true);
    });
  }
});
