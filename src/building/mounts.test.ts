import { describe, expect, it } from 'vitest';
import { mountedTransform, nameplateMount } from './mounts';
import { emptyHouse } from './types';
import { GRID, WALL_THICKNESS, floorY } from './dimensions';

const finish = { material: 'siding', color: '#fff' };
const wall = { id: 'wall', level: 0, x0: 1, z0: 2, x1: 5, z1: 2, exterior: finish, interior: finish };
const house = { ...emptyHouse(), walls: [wall] };
describe('wall mounted nameplates', () => {
  it.each([-1, 1])('stays on the tapped side (%s), rather than projecting through the wall', (side) => {
    const mount = nameplateMount(house, wall, { x: 2 * GRID, y: floorY(0) + 1.6, z: 2 * GRID }, { x: 2 * GRID, z: 2 * GRID + side * 3 })!;
    const p = mountedTransform(house, mount)!;
    expect(mount.side).toBe(side);
    expect((p.z - 2 * GRID) * side).toBeCloseTo(WALL_THICKNESS / 2 + 0.0155);
    expect(p.y + 1.6).toBeCloseTo(floorY(0) + 1.6);
    expect(Math.cos(p.rotation * Math.PI / 180)).toBeCloseTo(side);
  });
  it('follows a moved wall and preserves entered text through saving', () => {
    const wallMount = nameplateMount(house, wall, { x: 2 * GRID, y: 1.9, z: 2 * GRID }, { x: 0, z: 0 })!;
    const moved = { ...house, walls: [{ ...wall, x0: 2, x1: 6 }] };
    expect(mountedTransform(moved, wallMount)!.x - mountedTransform(house, wallMount)!.x).toBeCloseTo(GRID);
    const saved = JSON.parse(JSON.stringify({ wallMount, label: '牧浦 SHINGO' }));
    expect(saved.label).toBe('牧浦 SHINGO');
    expect(saved.wallMount).toEqual(wallMount);
  });
  it('rejects a position inside a door opening', () => {
    const opened = { ...house, openings: [{ id: 'door', wallId: wall.id, kind: 'door' as const, type: 'entrance', offset: GRID, sashColor: '#fff', panelColor: '#fff' }] };
    expect(nameplateMount(opened, wall, { x: 2 * GRID, y: 1.9, z: 2 * GRID }, { x: 0, z: 0 })).toBeNull();
  });
});
