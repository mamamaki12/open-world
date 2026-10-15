// 公営競技（競馬・競輪・ボートレース）。出走表を作り、多数回の模擬レースから確率を出してオッズを決める。
// 結果も同じ模型で走らせるので、オッズと実際の当たりやすさが一致する。払戻率（控除率）は実際の公営競技に近い値。
import type { Rng } from './rng';
import { gauss, pick, seeded } from './rng';

export type RaceKind = 'horse' | 'keirin' | 'boat';
export type BetKind = 'win' | 'place' | 'quinella' | 'exacta' | 'wide';

export interface RaceConfig {
  kind: RaceKind;
  title: string;
  icon: string;
  runners: number;
  /** 複勝が当たる着順（ボートは2着まで、ほかは3着まで） */
  placeCount: number;
  bets: BetKind[];
  betNames: Record<BetKind, string>;
  /** 払戻率（賭け金のうち払い戻しに回る割合） */
  payout: Record<BetKind, number>;
  /** 実力差の大きさ */
  spread: number;
  /** 区間ごとの調子のぶれ */
  noise: number;
  /** 最後の区間（直線・まくり）のぶれ */
  lastNoise: number;
  /** 内側ほど有利になる強さ（ボートの1コース） */
  laneBias: number;
  venues: string[];
  distances: string[];
  /** 枠・車番・艇番の色 */
  colors: { bg: string; fg: string }[];
}

const NUMBER_COLORS = [
  { bg: '#ffffff', fg: '#222' },
  { bg: '#222222', fg: '#fff' },
  { bg: '#e53935', fg: '#fff' },
  { bg: '#1e63d6', fg: '#fff' },
  { bg: '#f4c430', fg: '#222' },
  { bg: '#2e9d4a', fg: '#fff' },
  { bg: '#f08a24', fg: '#222' },
  { bg: '#f48fb1', fg: '#222' },
  { bg: '#7b4bb8', fg: '#fff' },
  { bg: '#7fd3e6', fg: '#222' },
];

export const RACES: Record<RaceKind, RaceConfig> = {
  horse: {
    kind: 'horse',
    title: '競馬',
    icon: '🏇',
    runners: 10,
    placeCount: 3,
    bets: ['win', 'place', 'quinella', 'wide', 'exacta'],
    betNames: { win: '単勝', place: '複勝', quinella: '馬連', exacta: '馬単', wide: 'ワイド' },
    payout: { win: 0.8, place: 0.8, quinella: 0.775, wide: 0.775, exacta: 0.75 },
    spread: 0.01,
    noise: 0.03,
    lastNoise: 0.05,
    laneBias: 0,
    venues: ['東京', '中山', '阪神', '京都', '札幌', '小倉'],
    distances: ['芝1200m', '芝1600m', '芝2000m', 'ダート1400m', 'ダート1800m', '芝2400m'],
    colors: NUMBER_COLORS,
  },
  keirin: {
    kind: 'keirin',
    title: '競輪',
    icon: '🚴',
    runners: 9,
    placeCount: 3,
    bets: ['quinella', 'exacta', 'wide'],
    betNames: { win: '単勝', place: '複勝', quinella: '2車複', exacta: '2車単', wide: 'ワイド' },
    payout: { win: 0.75, place: 0.75, quinella: 0.75, wide: 0.75, exacta: 0.75 },
    spread: 0.01,
    noise: 0.02,
    lastNoise: 0.06,
    laneBias: 0,
    venues: ['立川', '松戸', '岸和田', '小倉', '平塚', '伊東'],
    distances: ['2025m（5周）', '1625m（4周）'],
    colors: NUMBER_COLORS,
  },
  boat: {
    kind: 'boat',
    title: 'ボートレース',
    icon: '🚤',
    runners: 6,
    placeCount: 2,
    bets: ['win', 'place', 'quinella', 'exacta', 'wide'],
    betNames: { win: '単勝', place: '複勝', quinella: '2連複', exacta: '2連単', wide: '拡連複' },
    payout: { win: 0.75, place: 0.75, quinella: 0.75, wide: 0.75, exacta: 0.75 },
    spread: 0.008,
    noise: 0.03,
    lastNoise: 0.03,
    laneBias: 0.022,
    venues: ['住之江', '戸田', '平和島', '大村', '常滑', '若松'],
    distances: ['1800m（3周）'],
    colors: NUMBER_COLORS,
  },
};

const HORSE_A = ['サクラ', 'シルバー', 'ゴールド', 'ミラクル', 'ダイヤ', 'スター', 'レッド', 'ブルー', 'ドリーム', 'ライジング', 'ウインド', 'ハヤテ', 'ムーン', 'サニー', 'ロイヤル', 'ノーブル'];
const HORSE_B = ['ボルト', 'クイーン', 'キング', 'ウィナー', 'ロード', 'フラッシュ', 'ハート', 'スピリット', 'エース', 'ダンサー', 'アロー', 'ブレイブ', 'テイル', 'スマイル', 'リーフ', 'ソング'];
const FAMILY = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '松本', '井上', '木村', '林', '清水', '森'];
const GIVEN = ['健太', '翔', '大輔', '拓也', '直樹', '亮', '誠', '剛', '悠斗', '蓮', '美咲', '彩', '真由', '瞳', '陽菜', '優'];

export interface Runner {
  no: number;
  name: string;
  /** 実力（0 が平均） */
  ability: number;
  /** 調子の表示（◎○▲△✕ 用の5段階） */
  form: number;
}

export interface Race {
  id: string;
  kind: RaceKind;
  /** 何レース目か */
  no: number;
  venue: string;
  distance: string;
  seed: number;
  runners: Runner[];
}

export interface Odds {
  win: number[];
  place: number[];
  /** [i][j]（i<j）：2着までに i と j（順不同） */
  quinella: number[][];
  /** [i][j]：1着 i、2着 j */
  exacta: number[][];
  /** [i][j]（i<j）：i と j がともに3着以内 */
  wide: number[][];
}

export function makeRace(kind: RaceKind, no: number, seed: number): Race {
  const cfg = RACES[kind];
  const rng = seeded(seed);
  const used = new Set<string>();
  const runners: Runner[] = [];
  for (let i = 0; i < cfg.runners; i++) {
    let name = '';
    do {
      name = kind === 'horse' ? pick(rng, HORSE_A) + pick(rng, HORSE_B) : `${pick(rng, FAMILY)} ${pick(rng, GIVEN)}`;
    } while (used.has(name));
    used.add(name);
    const ability = gauss(rng) * cfg.spread;
    runners.push({ no: i + 1, name, ability, form: 0 });
  }
  // 調子の印は実力の順位から
  const order = [...runners].sort((a, b) => b.ability - a.ability);
  order.forEach((r, i) => (r.form = Math.min(4, Math.floor((i / cfg.runners) * 5))));
  return {
    id: `${kind}-${seed}`,
    kind,
    no,
    venue: pick(rng, cfg.venues),
    distance: pick(rng, cfg.distances),
    seed,
    runners,
  };
}

export const SEGMENTS = 5;

export interface RaceRun {
  /** 区間ごとのタイム [runner][segment]（模型の単位） */
  splits: number[][];
  /** 着順（runner の index） */
  order: number[];
}

/** レースを1回走らせる */
export function runRace(race: Race, rng: Rng): RaceRun {
  const cfg = RACES[race.kind];
  const splits = race.runners.map((r, i) => {
    const lane = cfg.laneBias * (cfg.runners - 1 - i) / (cfg.runners - 1);
    const out: number[] = [];
    for (let s = 0; s < SEGMENTS; s++) {
      const noise = s === SEGMENTS - 1 ? cfg.lastNoise : cfg.noise;
      // ボートはスタート直後の1周目1マークで内側が有利
      const bias = s === 0 ? lane * 3 : lane;
      const speed = 1 + r.ability + bias + gauss(rng) * noise;
      out.push(1 / SEGMENTS / Math.max(speed, 0.5));
    }
    return out;
  });
  const total = splits.map((s) => s.reduce((a, b) => a + b, 0));
  const order = total.map((_, i) => i).sort((a, b) => total[a] - total[b]);
  return { splits, order };
}

const SIMULATIONS = 6000;

function toOdds(count: number, sims: number, rate: number): number {
  const p = Math.max(count, 0.5) / sims;
  return Math.min(9999.9, Math.max(1, Math.floor((rate / p) * 10) / 10));
}

/** 多数回の模擬レースからオッズを出す */
export function computeOdds(race: Race): Odds {
  const cfg = RACES[race.kind];
  const n = race.runners.length;
  const rng = seeded(race.seed ^ 0x5bd1e995);
  const win = Array(n).fill(0);
  const place = Array(n).fill(0);
  const grid = () => Array.from({ length: n }, () => Array(n).fill(0));
  const quinella = grid();
  const exacta = grid();
  const wide = grid();
  for (let k = 0; k < SIMULATIONS; k++) {
    const { order } = runRace(race, rng);
    win[order[0]]++;
    for (let p = 0; p < cfg.placeCount; p++) place[order[p]]++;
    const [a, b, c] = order;
    quinella[Math.min(a, b)][Math.max(a, b)]++;
    exacta[a][b]++;
    for (const [x, y] of [[a, b], [a, c], [b, c]]) wide[Math.min(x, y)][Math.max(x, y)]++;
  }
  const map1 = (arr: number[], rate: number) => arr.map((c) => toOdds(c, SIMULATIONS, rate));
  const map2 = (g: number[][], rate: number) => g.map((row) => row.map((c) => toOdds(c, SIMULATIONS, rate)));
  return {
    win: map1(win, cfg.payout.win),
    place: map1(place, cfg.payout.place),
    quinella: map2(quinella, cfg.payout.quinella),
    exacta: map2(exacta, cfg.payout.exacta),
    wide: map2(wide, cfg.payout.wide),
  };
}

export interface RaceBet {
  kind: BetKind;
  /** 選んだ番号（runner の index）。単勝・複勝は1つ、ほかは2つ（馬単・2連単は 1着→2着の順） */
  picks: number[];
  stake: number;
}

export function betOdds(odds: Odds, bet: Pick<RaceBet, 'kind' | 'picks'>): number {
  const [a, b] = bet.picks;
  switch (bet.kind) {
    case 'win':
      return odds.win[a];
    case 'place':
      return odds.place[a];
    case 'exacta':
      return odds.exacta[a][b];
    case 'quinella':
      return odds.quinella[Math.min(a, b)][Math.max(a, b)];
    case 'wide':
      return odds.wide[Math.min(a, b)][Math.max(a, b)];
  }
}

export function betHits(race: Race, run: RaceRun, bet: Pick<RaceBet, 'kind' | 'picks'>): boolean {
  const cfg = RACES[race.kind];
  const [a, b] = bet.picks;
  const o = run.order;
  switch (bet.kind) {
    case 'win':
      return o[0] === a;
    case 'place':
      return o.slice(0, cfg.placeCount).includes(a);
    case 'exacta':
      return o[0] === a && o[1] === b;
    case 'quinella':
      return a !== b && o.slice(0, 2).includes(a) && o.slice(0, 2).includes(b);
    case 'wide':
      return a !== b && o.slice(0, 3).includes(a) && o.slice(0, 3).includes(b);
  }
}

export function betPicksNeeded(kind: BetKind): number {
  return kind === 'win' || kind === 'place' ? 1 : 2;
}

/** 払戻金（10円単位で切り捨て。はずれは 0） */
export function betPayout(race: Race, run: RaceRun, odds: Odds, bet: RaceBet): number {
  if (!betHits(race, run, bet)) return 0;
  return Math.floor((bet.stake * betOdds(odds, bet)) / 10) * 10;
}

/** アニメーション用：時刻 t（模型の単位）での進んだ割合 0..1 */
export function progressAt(splits: number[], t: number): number {
  let acc = 0;
  for (let s = 0; s < splits.length; s++) {
    if (t <= acc + splits[s]) return (s + (t - acc) / splits[s]) / splits.length;
    acc += splits[s];
  }
  return 1;
}

/** アニメーション用：時刻 t での順位（runner の index の並び） */
export function standingsAt(run: RaceRun, t: number): number[] {
  const prog = run.splits.map((s) => progressAt(s, t));
  const finishedAt = run.splits.map((s) => s.reduce((a, b) => a + b, 0));
  return prog
    .map((_, i) => i)
    .sort((a, b) => {
      const fa = prog[a] >= 1, fb = prog[b] >= 1;
      if (fa && fb) return finishedAt[a] - finishedAt[b];
      return prog[b] - prog[a];
    });
}
