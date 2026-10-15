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
import { RACES, betHits, betOdds, computeOdds, makeRace, progressAt, runRace } from './race';
import type { RaceKind } from './race';
import { seeded } from './rng';

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
    it(`${RACES[kind].title}：オッズどおりに買い続けると払戻率くらいになる`, () => {
      const race = makeRace(kind, 1, 42);
      const odds = computeOdds(race);
      const rng = seeded(7);
      const cfg = RACES[kind];
      // 1番人気の単勝（競輪は2車複）を買い続ける
      const fav = odds.win.indexOf(Math.min(...odds.win));
      const bet = cfg.bets.includes('win')
        ? { kind: 'win' as const, picks: [fav] }
        : { kind: 'quinella' as const, picks: [fav, odds.win.indexOf([...odds.win].sort((a, b) => a - b)[1])] };
      const o = betOdds(odds, bet);
      let back = 0;
      const N = 6000;
      for (let i = 0; i < N; i++) if (betHits(race, runRace(race, rng), bet)) back += o;
      const rate = back / N;
      expect(rate).toBeGreaterThan(cfg.payout[bet.kind] - 0.12);
      expect(rate).toBeLessThan(cfg.payout[bet.kind] + 0.12);
    });
  }

  it('ボートは1号艇が勝ちやすい', () => {
    let first = 0;
    for (let s = 0; s < 40; s++) {
      const odds = computeOdds(makeRace('boat', 1, s));
      if (odds.win[0] === Math.min(...odds.win)) first++;
    }
    expect(first).toBeGreaterThan(18);
  });

  it('アニメーションの進み具合は 0 から 1', () => {
    const run = runRace(makeRace('horse', 1, 3), seeded(1));
    const sp = run.splits[0];
    expect(progressAt(sp, 0)).toBe(0);
    expect(progressAt(sp, 99)).toBe(1);
    expect(progressAt(sp, sp[0])).toBeCloseTo(1 / sp.length, 5);
  });
});
