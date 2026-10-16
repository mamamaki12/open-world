import { describe, expect, it } from 'vitest';
import { CARS } from '../catalog/cars';
import { GRID } from './dimensions';
import { carSamples, integrateDrive } from './driving';
import { emptyHouse } from './types';
import type { House } from './types';
import { carHitsWalls } from './vehicleWalls';

const def = { width: 2, length: 4, height: 1.5 };
const pose = () => ({ x: 0, z: 0, yaw: 0, speed: 0, steer: 0, wheelSpin: 0, braking: false });
const house = (ax: number, az: number, bx: number, bz: number, level = 0): House => ({
  ...emptyHouse(), walls: [{ id: 'wall', level, x0: ax / GRID, z0: az / GRID, x1: bx / GRID, z1: bz / GRID,
    exterior: { material: 'siding', color: '#ffffff' }, interior: { material: 'siding', color: '#ffffff' } }],
});
describe('車体全体と壁の当たり判定', () => {
  it('covers a wall endpoint in the corner missed by the original three circles', () => {
    const h = house(1.02, 1.8, 1.02, 2.4), p = pose();
    expect(carSamples(p, def as typeof CARS[number]).every(s => Math.hypot(s.x - 1.02, s.z - 1.8) > def.width / 2 + .04)).toBe(true);
    expect(carHitsWalls(p, def, h)).toBe(true);
  });
  it('covers all four corners at different headings for every vehicle', () => {
    for (const d of CARS) for (const yaw of [0, Math.PI / 4, Math.PI / 2, -Math.PI / 3]) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x = sx * (d.width / 2 - .02), z = sz * (d.length / 2 - .02);
        const wx = x * Math.cos(yaw) + z * Math.sin(yaw), wz = -x * Math.sin(yaw) + z * Math.cos(yaw);
        expect(carHitsWalls({ ...pose(), yaw }, d, house(wx, wz, wx + .01, wz)), d.id).toBe(true);
      }
    }
  });
  it('detects side contact and crossing without blocking a nearby clear wall', () => {
    expect(carHitsWalls(pose(), def, house(-3, 0, 3, 0))).toBe(true);
    expect(carHitsWalls(pose(), def, house(1.05, -3, 1.05, 3))).toBe(true);
    expect(carHitsWalls(pose(), def, house(1.2, -3, 1.2, 3))).toBe(false);
    expect(carHitsWalls(pose(), def, house(-3, 2.2, 3, 2.2))).toBe(false);
    expect(carHitsWalls(pose(), def, house(1.05, 3, 1.05, -3))).toBe(true);
  });
  it('respects house offsets, low fences and upper-floor height', () => {
    const h = house(1.02, 1.8, 1.02, 2.4);
    expect(carHitsWalls({ ...pose(), x: 50, z: 70 }, def, h, undefined, { x: 50, z: 70 })).toBe(true);
    expect(carHitsWalls(pose(), def, house(1.02, 1.8, 1.02, 2.4, 1))).toBe(false);
    h.walls[0].height = 'fence';
    expect(carHitsWalls(pose(), def, h)).toBe(true);
  });
  it('lets a fitting car through an open doorway while blocking closed, narrow and low openings', () => {
    const h = house(-5, 0, 5, 0);
    h.openings.push({ id: 'door', wallId: 'wall', kind: 'door', type: 'entrance-wide', offset: 5, sashColor: '#ffffff', panelColor: '#ffffff' });
    const small = { width: 1, length: 3, height: 1.5 };
    expect(carHitsWalls(pose(), small, h)).toBe(true);
    expect(carHitsWalls(pose(), small, h, () => true)).toBe(false);
    expect(carHitsWalls(pose(), { ...small, width: 1.2 }, h, () => true)).toBe(true);
    expect(carHitsWalls(pose(), { ...small, height: 3 }, h, () => true)).toBe(true);
    h.openings[0].type = 'sliding';
    expect(carHitsWalls(pose(), small, h, () => true)).toBe(true);
  });
  it('stops forward, reverse, angled and sliding approaches and permits driving away', () => {
    for (const speed of [12, -3]) for (const yaw of [0, .4]) for (const slipAngle of [0, .3]) {
      const p = { ...pose(), yaw, slipAngle, speed };
      const wallZ = speed > 0 ? -2.5 : 2.5;
      const h = house(-8, wallZ, 8, wallZ);
      for (let i = 0; i < 80; i++) integrateDrive(p, { throttle: speed > 0 ? 1 : -1, steering: 0, brake: false }, .025, CARS[0], q => carHitsWalls(q, CARS[0], h));
      expect(carHitsWalls(p, CARS[0], h)).toBe(false);
      expect(p.speed).toBe(0);
      const before = p.z;
      for (let i = 0; i < 20; i++) integrateDrive(p, { throttle: speed > 0 ? -1 : 1, steering: 0, brake: false }, .025, CARS[0], q => carHitsWalls(q, CARS[0], h));
      expect(Math.abs(p.z - before)).toBeGreaterThan(.05);
    }
  });
});
