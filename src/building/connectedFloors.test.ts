import { describe, expect, it } from 'vitest';
import { canPlaceFloor } from './rules';
import { floorExtensionLevel } from './floorPlacement';
import { moveBuildingGroup } from './groups';
import { emptyHouse } from './types';
import { applyChanges, changes } from '../session/edits';
import type { FloorPart, House, WallPart } from './types';

const finish = { material: 'flooring', color: '#c8a57a' };
const floor = (id: string, x0: number, z0 = 2, level = 1): FloorPart => ({ id, level, x0, z0, x1: x0 + 2, z1: z0 + 2, finish });
const wall: WallPart = { id: 'support', level: 0, x0: 2, x1: 2, z0: 2, z1: 4, exterior: finish, interior: finish };
const base: House = { ...emptyHouse(), walls: [wall], floors: [floor('root', 2)] };

describe('壁につながる上階の床', () => {
  it('壁のない外側へ、辺で接する床を延長できる', () => {
    expect(canPlaceFloor(base, 1, floor('new', 4))).toBeNull();
    expect(canPlaceFloor(base, 1, floor('new', 2, 4))).toBeNull();
    expect(canPlaceFloor(base, 1, { x0: 4, x1: 7, z0: 3, z1: 5 })).toBeNull();
  });
  it('追加順と素材に依存せず、複数の床をたどって延長できる', () => {
    const h = { ...base, floors: [{ ...floor('far', 6), finish: { ...finish, color: '#ffffff' } }, floor('middle', 4), ...base.floors] };
    expect(canPlaceFloor(h, 1, floor('new', 8))).toBeNull();
  });
  it('角だけの接触、隙間、別階は支えにならない', () => {
    expect(canPlaceFloor(base, 1, floor('new', 4, 4))).not.toBeNull();
    expect(canPlaceFloor(base, 1, floor('new', 5))).not.toBeNull();
    expect(canPlaceFloor({ ...base, walls: [] }, 2, floor('new', 4, 2, 2))).not.toBeNull();
  });
  it('壁を失った床の循環や半高壁からは延長できない', () => {
    const floors = [floor('a', 2), floor('b', 4), floor('c', 4, 4), floor('d', 2, 4)];
    expect(canPlaceFloor({ ...base, walls: [], floors }, 1, floor('new', 6))).not.toBeNull();
    expect(canPlaceFloor({ ...base, walls: [{ ...wall, height: 'half' }] }, 1, floor('new', 4))).not.toBeNull();
  });
  it('重なりと土地外の禁止を維持し、地面への設置も維持する', () => {
    expect(canPlaceFloor(base, 1, floor('new', 3))).not.toBeNull();
    expect(canPlaceFloor(base, 1, floor('new', -1))).not.toBeNull();
    expect(canPlaceFloor(emptyHouse(), 0, floor('new', 8))).toBeNull();
  });
  it('高層階でも直下の全高壁につながれば延長できる', () => {
    const h = { ...base, walls: [{ ...wall, level: 3 }], floors: [floor('root', 2, 2, 4)] };
    expect(canPlaceFloor(h, 4, floor('new', 4, 2, 4))).toBeNull();
  });
  it('移動後のグループ全体で支持を判定し、支えなしの移動は原子的に拒否する', () => {
    const h = { ...base, floors: [floor('extension', 4), ...base.floors] };
    const refs = [{ kind: 'floor' as const, id: 'extension' }, { kind: 'floor' as const, id: 'root' }, { kind: 'wall' as const, id: wall.id }];
    const moved = moveBuildingGroup(h, refs, 1, 1);
    expect(moved.error).toBeNull();
    expect(moved.house.floors[0].x0).toBe(5);
    expect(moveBuildingGroup(h, refs.slice(0, 2), 5, 0).house).toBe(h);
  });
  it('ポインターの下が地面でも隣接する上階の床面を選べる', () => {
    expect(floorExtensionLevel(base, 0, () => floor('new', 4))).toBe(1);
    expect(floorExtensionLevel(base, 0, () => floor('new', 5))).toBeNull();
    expect(floorExtensionLevel({ ...base, walls: [] }, 0, () => floor('new', 4))).toBeNull();
    expect(floorExtensionLevel(base, 2, () => floor('new', 4))).toBeNull();
  });
  it('共有編集も完成後の接続を使い、未支持の床だけの追加を拒否する', () => {
    const next = { ...base, floors: [...base.floors, floor('far', 6), floor('middle', 4)] };
    expect(applyChanges(base, changes(base, next))).toEqual(next);
    const unsupported = { ...base, floors: [...base.floors, floor('floating', 6)] };
    expect(() => applyChanges(base, changes(base, unsupported))).toThrow('壁に支えられた');
  });
});
