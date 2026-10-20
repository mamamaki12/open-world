import { describe, expect, it } from 'vitest';
import { materialGroup, moveBuildingGroup } from './groups';
import { emptyHouse } from './types';
import type { House, WallPart } from './types';
import { useGame } from '../state/store';
import { removePart } from './rules';

const finish = { material: 'siding', color: '#ffffff' };
const wall = (id: string, x0: number, z0: number, x1: number, z1: number): WallPart => ({ id, level: 0, x0, z0, x1, z1, exterior: finish, interior: finish });
function fixture(): House {
  return { ...emptyHouse(), walls: [wall('old', 1, 1, 3, 1), wall('new', 3, 1, 3, 3), { ...wall('other', 5, 5, 7, 5), exterior: { ...finish, color: '#000000' } }],
    openings: [{ id: 'door', wallId: 'old', kind: 'door', type: 'entrance', offset: 0.91, sashColor: '#fff', panelColor: '#fff' }],
    furniture: [{ id: 'plate', type: 'nameplate', level: 0, x: 2, z: 1, rotation: 0, color: '#fff', label: '山田', wallMount: { wallId: 'old', offset: 0.91, height: 1.6, side: 1 } }] };
}
describe('material groups', () => {
  it('groups separately created matching walls regardless of their ids', () => {
    expect(materialGroup(fixture(), { kind: 'wall', id: 'old' }).map(r => r.id)).toEqual(['old', 'new']);
  });
  it('can move only one part when grouping is turned off', () => {
    expect(materialGroup(fixture(), { kind: 'wall', id: 'old' }, false)).toHaveLength(1);
  });
  it('moves the whole group and keeps doors and attached nameplates with their wall', () => {
    const house = fixture();
    const result = moveBuildingGroup(house, materialGroup(house, { kind: 'wall', id: 'old' }), 1, 1);
    expect(result.error).toBeNull();
    expect(result.house.walls[0].x0).toBe(2);
    expect(result.house.walls[1].x0).toBe(4);
    expect(result.house.walls[2]).toBe(house.walls[2]);
    expect(result.house.openings).toBe(house.openings);
    expect(result.house.furniture[0].x).toBeCloseTo(2.91);
  });
  it('rejects an out-of-lot move atomically', () => {
    const house = fixture();
    const result = moveBuildingGroup(house, materialGroup(house, { kind: 'wall', id: 'old' }), -2, 0);
    expect(result.error).not.toBeNull();
    expect(result.house).toBe(house);
  });
  it('rejects collision with a different material group', () => {
    const house = fixture();
    expect(moveBuildingGroup(house, materialGroup(house, { kind: 'wall', id: 'old' }), 4, 4).error).not.toBeNull();
  });
  it('undoes and redoes the complete move in one step', () => {
    const house = fixture();
    useGame.setState({ house, past: [], future: [], selection: { kind: 'wall', id: 'old' }, groupSelection: true, lastCommit: null });
    useGame.getState().moveSelection(1, 0);
    expect(useGame.getState().past).toHaveLength(1);
    useGame.getState().undo();
    expect(useGame.getState().house).toBe(house);
    useGame.getState().redo();
    expect(useGame.getState().house.walls[1].x0).toBe(4);
  });
  it('removes attached nameplates when their wall is removed', () => {
    const house = removePart(fixture(), { kind: 'wall', id: 'old' });
    expect(house.furniture).toHaveLength(0);
    expect(house.openings).toHaveLength(0);
  });
  it('moves a selected mounted item only once when its wall is also selected', () => {
    const house = fixture();
    const result = moveBuildingGroup(house, [{ kind: 'wall', id: 'old' }, { kind: 'furniture', id: 'plate' }, { kind: 'opening', id: 'door' }], 1, 0);
    expect(result.error).toBeNull();
    expect(result.house.furniture[0].x).toBeCloseTo(house.furniture[0].x + .91);
    expect(result.house.openings).toBe(house.openings);
  });
  it('rejects moving a mounted item away from its wall atomically', () => {
    const house = fixture();
    const result = moveBuildingGroup(house, [{ kind: 'furniture', id: 'plate' }], 1, 0);
    expect(result.error).not.toBeNull();
    expect(result.house).toBe(house);
  });
});
