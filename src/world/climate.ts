// 季節・天気・昼夜。実時間（UTC）だけから決まるので、共有ワールドの全員が同じ空を見る。

/** 昼夜1周の長さ（実時間ミリ秒）。ゲーム内1時間 = 実1分 */
export const DAY_MS = 24 * 60_000;
/** 1つの季節の長さ（実時間ミリ秒）。1年 = 実1日 */
export const SEASON_MS = 6 * 3600_000;
/** 天気が切り替わる間隔（実時間ミリ秒） */
export const WEATHER_MS = 10 * 60_000;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow';

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_LABEL: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
export const WEATHER_LABEL: Record<Weather, string> = { clear: '☀ 晴れ', cloudy: '☁ くもり', rain: '☂ 雨', snow: '❄ 雪' };

export interface Climate {
  /** ゲーム内の時刻（0〜24 時） */
  hour: number;
  season: Season;
  weather: Weather;
  /** 太陽の高さ（-1 真夜中 〜 1 真昼） */
  sun: number;
  /** 夜らしさ（0 昼〜1 夜）。街灯・窓の明かりに使う */
  night: number;
}

function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function seasonAt(now: number): Season {
  return SEASONS[Math.floor(now / SEASON_MS) % 4];
}

export function weatherAt(now: number): Weather {
  const season = seasonAt(now);
  const r = hash(Math.floor(now / WEATHER_MS));
  // 季節ごとの くもり・雨（冬は雪）の出やすさ
  const [cloud, wet] = { spring: [0.25, 0.2], summer: [0.15, 0.2], autumn: [0.3, 0.2], winter: [0.25, 0.35] }[season];
  if (r < wet) return season === 'winter' ? 'snow' : 'rain';
  if (r < wet + cloud) return 'cloudy';
  return 'clear';
}

export function climateAt(now: number): Climate {
  const hour = (((now % DAY_MS) + DAY_MS) % DAY_MS) / DAY_MS * 24;
  // 6時に日の出、18時に日の入り
  const sun = Math.sin(((hour - 6) / 24) * Math.PI * 2);
  const night = Math.min(1, Math.max(0, (0.15 - sun) / 0.3));
  return { hour, season: seasonAt(now), weather: weatherAt(now), sun, night };
}

/** 相場に掛ける軽い係数（1.0 前後）。春・秋は家が動きやすく、雨・雪の日は少し下がる */
export function climateMarketFactor(now: number): number {
  const s = { spring: 1.02, summer: 1.0, autumn: 1.01, winter: 0.98 }[seasonAt(now)];
  const w = { clear: 1.0, cloudy: 1.0, rain: 0.99, snow: 0.98 }[weatherAt(now)];
  return Math.round(s * w * 1000) / 1000;
}

export function clockLabel(c: Climate): string {
  const h = Math.floor(c.hour);
  const m = Math.floor((c.hour - h) * 60);
  return `${SEASON_LABEL[c.season]} ${h}:${String(m).padStart(2, '0')} ${WEATHER_LABEL[c.weather]}`;
}
