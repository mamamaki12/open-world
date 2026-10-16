import { describe, expect, it } from 'vitest';
import { DAY_MS, SEASON_MS, WEATHER_MS, climateAt, climateMarketFactor, seasonAt, weatherAt } from './climate';

describe('climate', () => {
  it('同じ時刻なら誰が計算しても同じ', () => {
    const t = 1_790_000_000_000;
    expect(climateAt(t)).toEqual(climateAt(t));
  });
  it('昼は明るく夜は暗い', () => {
    expect(climateAt(DAY_MS / 2).night).toBe(0);
    expect(climateAt(0).night).toBe(1);
  });
  it('季節は春夏秋冬の順', () => {
    expect([0, 1, 2, 3].map((i) => seasonAt(i * SEASON_MS + 1))).toEqual(['spring', 'summer', 'autumn', 'winter']);
  });
  it('雪は冬だけ、天気はいろいろ出る', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const t = i * WEATHER_MS;
      const w = weatherAt(t);
      seen.add(w);
      if (w === 'snow') expect(seasonAt(t)).toBe('winter');
      if (seasonAt(t) === 'winter') expect(w).not.toBe('rain');
    }
    expect(seen.size).toBe(4);
  });
  it('相場の係数は軽め', () => {
    for (let i = 0; i < 200; i++) {
      const f = climateMarketFactor(i * WEATHER_MS);
      expect(f).toBeGreaterThan(0.95);
      expect(f).toBeLessThan(1.05);
    }
  });
});
