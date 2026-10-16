import { describe, expect, it } from 'vitest';
import { FURNITURE, MATERIALS, OPENINGS, SASH_TYPES } from '../catalog';
import { DISTRICTS, START_PLOT, freePlot, plotsOf } from '../economy/town';
import { GRID, LOT_D, LOT_W, MAX_LEVEL } from './dimensions';
import { canPlaceFloor, canPlaceOpening, canPlaceRoof, canPlaceStair, canPlaceWall } from './rules';
import { TOWN_HOUSE_DESIGNS, TOWN_HOUSE_PLOTS, exceedsPlayerLevels, townHouseAt } from './townHouses';
import { emptyHouse } from './types';
import type { House } from './types';

const materials = new Set(MATERIALS.map((m) => m.id));
const openings = new Set(OPENINGS.map((o) => o.id));
const furniture = new Set(FURNITURE.map((f) => f.id));
const sashes = new Set(SASH_TYPES.map((s) => s.id));

/** プレイヤーが建築モードで置くのと同じ順番・同じ判定で、1つずつ置き直してみる */
function replay(house: House, fullRules: boolean): string[] {
  const errors: string[] = [];
  const h = emptyHouse();
  const levels = [...new Set([...house.floors, ...house.walls].map((p) => p.level))].sort((a, b) => a - b);
  for (const level of levels) {
    for (const f of house.floors.filter((x) => x.level === level)) {
      const e = canPlaceFloor(h, level, f);
      if (e) errors.push(`floor ${f.id}: ${e}`);
      h.floors.push(f);
    }
    for (const w of house.walls.filter((x) => x.level === level)) {
      const e = canPlaceWall(h, w);
      if (e) errors.push(`wall ${w.id}: ${e}`);
      h.walls.push(w);
    }
  }
  for (const o of house.openings) {
    const e = canPlaceOpening(h, o.wallId, o.type, o.offset);
    if (e) errors.push(`opening ${o.id}: ${e}`);
    h.openings.push(o);
  }
  if (fullRules) {
    for (const s of house.stairs) {
      const e = canPlaceStair(h, s);
      if (e) errors.push(`stair ${s.id}: ${e}`);
      h.stairs.push(s);
    }
  }
  for (const r of house.roofs) {
    const e = canPlaceRoof(h, r.level, r);
    if (e) errors.push(`roof ${r.id}: ${e}`);
    h.roofs.push(r);
  }
  return errors;
}

describe('町に最初から建っている家', () => {
  it('どの家もカタログにある部品・素材・家具だけでできている', () => {
    for (const d of TOWN_HOUSE_DESIGNS) {
      const h = d.build();
      const finishes = [
        ...h.floors.map((f) => f.finish), ...h.walls.flatMap((w) => [w.exterior, w.interior]),
        ...h.roofs.flatMap((r) => [r.finish, r.gableFinish]), ...h.stairs.map((s) => s.finish),
      ];
      for (const f of finishes) expect(materials, `${d.id}: ${f.material}`).toContain(f.material);
      for (const o of h.openings) {
        expect(openings).toContain(o.type);
        if (o.sash) expect(sashes).toContain(o.sash);
      }
      for (const f of h.furniture) expect(furniture, `${d.id}: ${f.type}`).toContain(f.type);
    }
  });

  it('建築モードと同じルールで置ける（壁が重ならない・窓が壁に収まる・上の階の床は壁の上）', () => {
    for (const d of TOWN_HOUSE_DESIGNS) {
      const h = d.build();
      expect(replay(h, !exceedsPlayerLevels(h)), d.id).toEqual([]);
    }
  });

  it('家具は土地の中にあり、ID はかぶらない', () => {
    for (const d of TOWN_HOUSE_DESIGNS) {
      const h = d.build();
      for (const f of h.furniture) {
        expect(f.x, `${d.id} ${f.type}`).toBeGreaterThan(0);
        expect(f.z, `${d.id} ${f.type}`).toBeGreaterThan(0);
        expect(f.x).toBeLessThan(LOT_W * GRID);
        expect(f.z).toBeLessThan(LOT_D * GRID);
      }
      const ids = [h.floors, h.walls, h.openings, h.stairs, h.roofs, h.furniture].flat().map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('一軒家は2階建てまで（プレイヤーと同じ）、内装（キッチン・浴室・トイレ・ベッド）がある', () => {
    for (const d of TOWN_HOUSE_DESIGNS) {
      const h = d.build();
      const has = (t: string) => h.furniture.some((f) => f.type === t || f.type.startsWith(t));
      expect(has('kitchen') && has('bath') && has('toilet') && has('bed'), d.id).toBe(true);
      if (d.kind === 'house' && d.id !== 'narrow') expect(h.walls.every((w) => w.level <= MAX_LEVEL), d.id).toBe(true);
    }
  });

  it('はじめの土地には建てず、どの地区にも買える空き区画が残る', () => {
    expect(TOWN_HOUSE_PLOTS[START_PLOT]).toBeUndefined();
    for (const [plot, id] of Object.entries(TOWN_HOUSE_PLOTS)) {
      expect(TOWN_HOUSE_DESIGNS.some((d) => d.id === id)).toBe(true);
      expect(townHouseAt(Number(plot))).not.toBeNull();
    }
    for (const d of DISTRICTS) {
      const built = plotsOf(d.location).filter((p) => TOWN_HOUSE_PLOTS[p]);
      expect(built.length, d.location).toBeGreaterThan(0);
      const free = freePlot(d.location, [START_PLOT]);
      expect(free, d.location).not.toBeNull();
      expect(TOWN_HOUSE_PLOTS[free!]).toBeUndefined();
    }
  });
});
