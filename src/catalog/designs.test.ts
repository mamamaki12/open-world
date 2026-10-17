import { describe, expect, it } from 'vitest';
import { furnitureDef, hasMovingParts } from './index';
import { TEMPLATES, designPrice, sanitizeDesign } from './designs';
import { nearestSeat } from '../building/seating';
import { emptyHouse } from '../building/types';
import type { FurnitureDef } from './index';

const chair = { ...TEMPLATES.find((t) => t.name === '椅子')!.def, id: 'design:test-chair' } as FurnitureDef;

describe('デザイン家具', () => {
  it('壊れた・大きすぎるデータを整える', () => {
    const d = sanitizeDesign({ id: 'design:x', name: 'a'.repeat(80), colors: ['red', '#112233'], parts: [
      { shape: 'cube', size: [99, -1, 'x'], pos: [0, 0, 0], paint: 'gold', move: 'fly' },
      ...Array(60).fill({ shape: 'box', size: [0.1, 0.1, 0.1], pos: [0, 0, 0], paint: 'wood' }),
    ] })!;
    expect(d.name.length).toBe(30);
    expect(d.colors).toEqual(['#112233']);
    expect(d.parts).toHaveLength(40);
    expect(d.parts[0]).toEqual({ shape: 'box', size: [3, 0.01, 0.1], pos: [0, 0, 0], paint: 'main' });
    expect(sanitizeDesign({ id: 'sofa', parts: [] })).toBeNull();
  });

  it('家具に入ったデザインで形・値段が決まる', () => {
    const item = { type: chair.id, design: chair };
    expect(furnitureDef(item).name).toBe('わたしの椅子');
    expect(designPrice(chair)).toBeGreaterThan(5000);
    const chest = { ...TEMPLATES.find((t) => t.name === 'チェスト')!.def, id: 'design:c' } as FurnitureDef;
    expect(hasMovingParts(chest)).toBe(true);
    expect(hasMovingParts(chair)).toBe(false);
  });

  it('座れるデザインの椅子に座れる', () => {
    const house = { ...emptyHouse(), furniture: [{ id: 'f1', level: 0, type: chair.id, design: chair, x: 2, z: 2, rotation: 0, color: '#ffffff' }] };
    const seat = nearestSeat(house, 2.5, 0, 2.5);
    expect(seat?.id).toBe('f1');
    expect(seat?.height).toBe(0.47);
  });
});
