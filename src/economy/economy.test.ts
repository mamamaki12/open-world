import { describe, expect, it } from 'vitest';
import { sampleHouse } from '../building/sample';
import { emptyHouse } from '../building/types';
import type { House } from '../building/types';
import {
  highLowMultiplier,
  roulettePayout,
  slotMultiplier,
  slotReturnRate,
} from './casino';
import { dailyBill, landPrice, salePrice, stepMarket } from './market';
import { buildSeconds, estimateCost, quality, renovationCost } from './pricing';
import {
  BET_SHAPE,
  RACES,
  comboOdds,
  comboProb,
  computeProbs,
  drawOrder,
  expandCombos,
  horseFrames,
  makeRace,
  ticketHits,
  winningCombos,
} from './race';
import type { RaceKind } from './race';
import { distanceAt, makeCourse, makeMotion, pointAt } from './raceMotion';
import { seeded } from './rng';
import prices from '../catalog/prices.json';
import { MATERIALS, MATERIAL_CATEGORY_NAMES, SASH_TYPES } from '../catalog';

const finish = { material: 'flooring', color: '#c8a57a' };
const oneRoom = (): House => ({
  ...emptyHouse(),
  floors: [{ id: 'f', level: 0, x0: 0, z0: 0, x1: 4, z1: 4, finish }],
});

describe('建築費', () => {
  it('サンプルの家は2千万円前後', () => {
    const { total } = estimateCost(sampleHouse());
    expect(total).toBeGreaterThan(12_000_000);
    expect(total).toBeLessThan(35_000_000);
  });

  it('改築は足したパーツと変えたパーツだけにかかる', () => {
    const built = oneRoom();
    expect(renovationCost(built, built).total).toBe(0);
    const bigger: House = {
      ...built,
      floors: [...built.floors, { id: 'g', level: 0, x0: 4, z0: 0, x1: 6, z1: 4, finish }],
    };
    expect(renovationCost(built, bigger).total).toBe(estimateCost({ ...emptyHouse(), floors: [bigger.floors[1]] }).total);
    const repainted: House = { ...built, floors: [{ ...built.floors[0], finish: { material: 'tatami', color: '#c7c48a' } }] };
    expect(renovationCost(built, repainted).total).toBe(estimateCost(repainted).total);
    // 取り壊しは無料
    expect(renovationCost(built, emptyHouse()).total).toBe(0);
  });

  it('家具を動かすだけならお金はかからない', () => {
    const h: House = { ...oneRoom(), furniture: [{ id: 's', level: 0, type: 'sofa', x: 1, z: 1, rotation: 0, color: '#7d8a96' }] };
    const moved: House = { ...h, furniture: [{ ...h.furniture[0], x: 2, rotation: 90 }] };
    expect(renovationCost(h, moved).total).toBe(0);
  });

  it('工事の待ち時間は数十秒〜数分', () => {
    expect(buildSeconds(0)).toBe(15);
    expect(buildSeconds(1e10)).toBe(180);
  });
});

describe('建材カタログ', () => {
  it('どの素材にも値段・色・説明がある', () => {
    const table = prices.materials as Record<string, number>;
    for (const m of MATERIALS) {
      expect(table[m.id], m.id).toBeGreaterThan(0);
      expect(m.colors.length, m.id).toBeGreaterThan(0);
      expect(m.note, m.id).toBeTruthy();
      expect(MATERIAL_CATEGORY_NAMES[m.category], m.id).toBeTruthy();
    }
    expect(new Set(MATERIALS.map((m) => m.id)).size).toBe(MATERIALS.length);
  });

  it('サッシの種類で窓の値段が変わる（古いセーブはアルミ扱い）', () => {
    const house = sampleHouse();
    const window = house.openings.find((o) => o.kind === 'window')!;
    const base = estimateCost(house).byCategory.opening;
    expect(window.sash).toBeUndefined();
    const resin = SASH_TYPES.find((t) => t.id === 'resin')!;
    const upgraded: House = { ...house, openings: house.openings.map((o) => (o.id === window.id ? { ...o, sash: 'resin' } : o)) };
    expect(estimateCost(upgraded).byCategory.opening).toBeGreaterThan(base);
    expect(renovationCost(house, upgraded).byCategory.opening).toBeGreaterThan(0);
    expect(resin.priceRate).toBeGreaterThan(1);
  });
});

describe('査定', () => {
  it('屋根のない家は品質が下がる', () => {
    const noRoof = sampleHouse();
    const roofed = quality(noRoof).factor;
    expect(quality({ ...noRoof, roofs: [] }).factor).toBeLessThan(roofed);
  });

  it('設備をそろえると品質が上がる', () => {
    const base = quality(oneRoom()).factor;
    const equipped: House = {
      ...oneRoom(),
      furniture: ['kitchen', 'bath', 'toilet'].map((type, i) => ({ id: `f${i}`, level: 0, type, x: 1, z: 1, rotation: 0, color: '#fff' })),
    };
    expect(quality(equipped).factor).toBeCloseTo(base + 0.28, 5);
  });

  it('売値は相場に比例する', () => {
    expect(salePrice(10_000_000, 'town', 1, 1.2)).toBe(Math.round((22_000_000 * 1.2) / 10000) * 10000);
    expect(landPrice('city', 1, 0.5)).toBe(30_000_000);
  });

  it('家賃は貸しているときだけ入る', () => {
    const p = { buildCost: 10_000_000, appraisal: 9_000_000, landValue: 5_000_000, market: 1 };
    expect(dailyBill({ ...p, rented: false }).rent).toBe(0);
    expect(dailyBill({ ...p, rented: true }).rent).toBeGreaterThan(0);
    expect(dailyBill({ ...p, rented: true }).upkeep).toBe(5000);
  });
});

describe('相場', () => {
  it('上下しながらも範囲内にとどまり、平均は 1 の近く', () => {
    const rng = seeded(1);
    let m = 1;
    let sum = 0;
    for (let i = 0; i < 5000; i++) {
      m = stepMarket(m, rng);
      expect(m).toBeGreaterThanOrEqual(0.5);
      expect(m).toBeLessThanOrEqual(2);
      sum += m;
    }
    expect(sum / 5000).toBeGreaterThan(0.85);
    expect(sum / 5000).toBeLessThan(1.15);
  });
});

describe('カジノ', () => {
  it('スロットの還元率は 9 割台（少しだけ損をする）', () => {
    const r = slotReturnRate();
    expect(r).toBeGreaterThan(0.9);
    expect(r).toBeLessThan(1);
  });

  it('スロットの役', () => {
    expect(slotMultiplier(['seven', 'seven', 'seven'])).toBe(1000);
    expect(slotMultiplier(['cherry', 'bell', 'lemon'])).toBe(1);
    expect(slotMultiplier(['bell', 'bell', 'melon'])).toBe(0);
  });

  it('ルーレットの配当', () => {
    expect(roulettePayout({ kind: 'red' }, 1)).toBe(2);
    expect(roulettePayout({ kind: 'black' }, 1)).toBe(0);
    expect(roulettePayout({ kind: 'red' }, 0)).toBe(0);
    expect(roulettePayout({ kind: 'dozen', dozen: 3 }, 36)).toBe(3);
    expect(roulettePayout({ kind: 'number', number: 0 }, 0)).toBe(36);
    // 期待値は 36/37
    let total = 0;
    for (let n = 0; n <= 36; n++) total += roulettePayout({ kind: 'even' }, n);
    expect(total / 37).toBeCloseTo(36 / 37, 5);
  });

  it('ハイ＆ローは当たりにくいほど倍率が高く、期待値はマイナス', () => {
    expect(highLowMultiplier(13, 'high')).toBe(0);
    expect(highLowMultiplier(12, 'high')).toBeGreaterThan(highLowMultiplier(2, 'high'));
    for (let c = 1; c <= 13; c++) {
      for (const g of ['high', 'low'] as const) {
        const wins = g === 'high' ? 13 - c : c - 1;
        if (wins > 0) expect((highLowMultiplier(c, g) * wins) / 13).toBeLessThan(1);
      }
    }
  });
});

describe('公営競技', () => {
  for (const kind of Object.keys(RACES) as RaceKind[]) {
    it(`${RACES[kind].title}：全券種の確率の合計が正しく、オッズどおりの払戻率になる`, () => {
      const race = makeRace(kind, 1, 42);
      const pr = computeProbs(race);
      const idx = race.runners.map((r) => r.index);
      const frames = [...new Set(race.runners.map((r) => r.frame))];
      for (const type of RACES[kind].bets) {
        const { k, ordered } = BET_SHAPE[type];
        const all =
          k === 1 ? idx.map((i) => [i]) : type === 'bracket' ? expandCombos(race, type, 'normal', [frames]) : expandCombos(race, type, 'normal', ordered ? Array(k).fill(idx) : [idx]);
        const total = all.reduce((a, c) => a + comboProb(race, pr, type, c), 0);
        // 当たりの数：複勝は placeCount 個、ワイドは3個、それ以外は1個
        const hitsPerRace = type === 'place' ? pr.placeCount : type === 'wide' ? 3 : 1;
        expect(total).toBeCloseTo(hitsPerRace, 6);
        // どの買い目も、買い続けたときの戻りは払戻率以下（最低1.0倍の買い目を除く）
        for (const c of all.slice(0, 200)) {
          const p = comboProb(race, pr, type, c);
          const o = comboOdds(race, pr, type, c);
          if (o && o > 1) expect(p * o).toBeLessThanOrEqual(RACES[kind].payout[type]! + 1e-9);
        }
      }
    });

    it(`${RACES[kind].title}：着順の抽選がオッズの確率と一致する`, () => {
      const race = makeRace(kind, 1, 7);
      const pr = computeProbs(race);
      const rng = seeded(3);
      const wins = Array(race.runners.length).fill(0);
      const N = 20000;
      for (let i = 0; i < N; i++) wins[drawOrder(race, rng)[0]]++;
      wins.forEach((w, i) => expect(Math.abs(w / N - pr.win[i])).toBeLessThan(0.015));
    });
  }

  it('競馬の枠番は JRA と同じ割り振り', () => {
    expect(horseFrames(8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(horseFrames(10)).toEqual([1, 2, 3, 4, 5, 6, 7, 7, 8, 8]);
    expect(horseFrames(18)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8]);
  });

  it('ボックス・フォーメーション・ながしの点数', () => {
    const race = makeRace('horse', 1, 5);
    expect(expandCombos(race, 'trifecta', 'normal', [[0, 1, 2], [0, 1, 2], [0, 1, 2]]).length).toBe(6);
    expect(expandCombos(race, 'trio', 'normal', [[0, 1, 2, 3]]).length).toBe(4);
    expect(expandCombos(race, 'quinella', 'nagashi', [[0], [1, 2, 3]]).length).toBe(3);
    expect(expandCombos(race, 'trifecta', 'nagashi', [[0], [1, 2, 3]]).length).toBe(6);
    expect(expandCombos(race, 'exacta', 'normal', [[0, 1], [2]]).length).toBe(2);
  });

  it('当たりの判定', () => {
    const race = makeRace('boat', 1, 5);
    const order = [2, 0, 4, 1, 3, 5];
    expect(ticketHits(race, order, { type: 'trifecta', combo: [2, 0, 4] })).toBe(true);
    expect(ticketHits(race, order, { type: 'trio', combo: [0, 2, 4] })).toBe(true);
    expect(ticketHits(race, order, { type: 'exacta', combo: [0, 2] })).toBe(false);
    expect(ticketHits(race, order, { type: 'wide', combo: [0, 4] })).toBe(true);
    expect(ticketHits(race, order, { type: 'place', combo: [4] })).toBe(false); // ボートの複勝は2着まで
    expect(winningCombos(race, order).filter((w) => w.type === 'wide').length).toBe(3);
  });

  it('ボートは1号艇が勝ちやすい', () => {
    let sum = 0;
    for (let s = 0; s < 40; s++) sum += computeProbs(makeRace('boat', 1, s)).win[0];
    expect(sum / 40).toBeGreaterThan(0.35);
    expect(sum / 40).toBeLessThan(0.7);
  });

  it('レースの動き：決めた着順どおりにゴールし、距離は増え続ける', () => {
    for (const kind of Object.keys(RACES) as RaceKind[]) {
      const race = makeRace(kind, 1, 11);
      const order = drawOrder(race, seeded(2));
      const m = makeMotion(race, order, seeded(4));
      const finishOrder = race.runners.map((r) => r.index).sort((a, b) => m.finish[a] - m.finish[b]);
      expect(finishOrder).toEqual(order);
      for (const i of order) {
        let prev = -Infinity;
        for (let t = 0; t <= m.finish[i] + 5; t += 0.5) {
          const d = distanceAt(m, i, t);
          expect(d).toBeGreaterThanOrEqual(prev - 1e-6);
          prev = d;
        }
        expect(distanceAt(m, i, m.finish[i])).toBeCloseTo(race.distance, 3);
      }
    }
  });

  it('コースの形：1周回ると元の位置に戻る', () => {
    const c = makeCourse(makeRace('horse', 1, 1));
    const a = pointAt(c, 10, 0);
    const b = pointAt(c, 10 + c.circumference, 0);
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.y).toBeCloseTo(b.y, 6);
    // 周回上を少し進んだ点との距離は、進んだ距離とほぼ同じ（つながっている）
    for (let p = 0; p < c.circumference; p += 37) {
      const p1 = pointAt(c, p, 0);
      const p2 = pointAt(c, p + 1, 0);
      expect(Math.hypot(p2.x - p1.x, p2.y - p1.y)).toBeCloseTo(1, 1);
    }
  });
});
