// 公営競技（競馬・競輪・ボートレース）の出走表、券の種類、確率とオッズ、払い戻し。
// 着順は「強さ」に比例した確率で1着から順に決まる模型（プラケット・ルース）で決めるので、
// どの券種の確率も正確に計算でき、オッズ = 払戻率 ÷ 確率 がそのまま当たりやすさと一致する。
import type { Rng } from './rng';
import { gauss, pick, randInt, seeded } from './rng';

export type RaceKind = 'horse' | 'keirin' | 'boat';
export type BetType = 'win' | 'place' | 'bracket' | 'quinella' | 'wide' | 'exacta' | 'trio' | 'trifecta';

export const BET_ORDER: BetType[] = ['win', 'place', 'bracket', 'quinella', 'wide', 'exacta', 'trio', 'trifecta'];

/** 券種ごとの選ぶ数と、順番を問うか */
export const BET_SHAPE: Record<BetType, { k: number; ordered: boolean }> = {
  win: { k: 1, ordered: true },
  place: { k: 1, ordered: true },
  bracket: { k: 2, ordered: false },
  quinella: { k: 2, ordered: false },
  wide: { k: 2, ordered: false },
  exacta: { k: 2, ordered: true },
  trio: { k: 3, ordered: false },
  trifecta: { k: 3, ordered: true },
};

export interface RaceConfig {
  kind: RaceKind;
  title: string;
  icon: string;
  /** 頭・車・艇 */
  unit: string;
  /** 馬券・車券・舟券 */
  ticket: string;
  /** 馬・選手・選手 */
  who: string;
  /** 馬番・車番・艇番 */
  numberName: string;
  bets: BetType[];
  betNames: Partial<Record<BetType, string>>;
  /** 払戻率（実際の公営競技と同じ） */
  payout: Partial<Record<BetType, number>>;
  venues: string[];
}

export const RACES: Record<RaceKind, RaceConfig> = {
  horse: {
    kind: 'horse',
    title: '競馬',
    icon: '🏇',
    unit: '頭',
    ticket: '馬券',
    who: '馬',
    numberName: '馬番',
    bets: ['win', 'place', 'bracket', 'quinella', 'wide', 'exacta', 'trio', 'trifecta'],
    betNames: { win: '単勝', place: '複勝', bracket: '枠連', quinella: '馬連', wide: 'ワイド', exacta: '馬単', trio: '3連複', trifecta: '3連単' },
    payout: { win: 0.8, place: 0.8, bracket: 0.775, quinella: 0.775, wide: 0.775, exacta: 0.75, trio: 0.75, trifecta: 0.725 },
    venues: ['東京', '中山', '阪神', '京都', '札幌', '小倉'],
  },
  keirin: {
    kind: 'keirin',
    title: '競輪',
    icon: '🚴',
    unit: '車',
    ticket: '車券',
    who: '選手',
    numberName: '車番',
    bets: ['bracket', 'quinella', 'exacta', 'wide', 'trio', 'trifecta'],
    betNames: { bracket: '2枠複', quinella: '2車複', exacta: '2車単', wide: 'ワイド', trio: '3連複', trifecta: '3連単' },
    payout: { bracket: 0.75, quinella: 0.75, exacta: 0.75, wide: 0.75, trio: 0.75, trifecta: 0.75 },
    venues: ['立川', '松戸', '平塚', '伊東', '岸和田', '小倉'],
  },
  boat: {
    kind: 'boat',
    title: 'ボートレース',
    icon: '🚤',
    unit: '艇',
    ticket: '舟券',
    who: '選手',
    numberName: '艇番',
    bets: ['win', 'place', 'quinella', 'wide', 'exacta', 'trio', 'trifecta'],
    betNames: { win: '単勝', place: '複勝', quinella: '2連複', wide: '拡連複', exacta: '2連単', trio: '3連複', trifecta: '3連単' },
    payout: { win: 0.75, place: 0.75, quinella: 0.75, wide: 0.75, exacta: 0.75, trio: 0.75, trifecta: 0.75 },
    venues: ['住之江', '戸田', '平和島', '大村', '常滑', '若松'],
  },
};

/** 枠・車番・艇番の色（帽子・勝負服） */
export const NUMBER_COLORS = [
  { bg: '#ffffff', fg: '#222' },
  { bg: '#222222', fg: '#fff' },
  { bg: '#e53935', fg: '#fff' },
  { bg: '#1e63d6', fg: '#fff' },
  { bg: '#f4c430', fg: '#222' },
  { bg: '#2e9d4a', fg: '#fff' },
  { bg: '#f08a24', fg: '#222' },
  { bg: '#f48fb1', fg: '#222' },
  { bg: '#7b4bb8', fg: '#fff' },
];

const HORSE_A = ['サクラ', 'シルバー', 'ゴールド', 'ミラクル', 'ダイヤ', 'スター', 'レッド', 'ブルー', 'ドリーム', 'ライジング', 'ウインド', 'ハヤテ', 'ムーン', 'サニー', 'ロイヤル', 'ノーブル', 'マジック', 'アイアン', 'フェアリー', 'グランド'];
const HORSE_B = ['ボルト', 'クイーン', 'キング', 'ウィナー', 'ロード', 'フラッシュ', 'ハート', 'スピリット', 'エース', 'ダンサー', 'アロー', 'ブレイブ', 'テイル', 'スマイル', 'リーフ', 'ソング', 'ジェット', 'メモリー', 'ステップ', 'ワルツ'];
const FAMILY = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '松本', '井上', '木村', '林', '清水', '森', '池田', '橋本', '石川', '前田', '藤田', '岡田'];
const GIVEN = ['健太', '翔', '大輔', '拓也', '直樹', '亮', '誠', '剛', '悠斗', '蓮', '美咲', '彩', '真由', '瞳', '陽菜', '優', '一真', '隼人', '圭', '光'];
const COATS = [
  { name: '鹿毛', color: '#7a4a2a' },
  { name: '栗毛', color: '#a5582a' },
  { name: '黒鹿毛', color: '#3e2618' },
  { name: '青鹿毛', color: '#241812' },
  { name: '芦毛', color: '#b9b5ad' },
];
/** 競輪のラインを組む地区 */
const REGIONS = [
  { name: '北日本', prefs: ['青森', '岩手', '宮城', '福島'] },
  { name: '関東', prefs: ['茨城', '栃木', '群馬', '埼玉'] },
  { name: '南関東', prefs: ['千葉', '東京', '神奈川', '静岡'] },
  { name: '中部', prefs: ['愛知', '岐阜', '三重', '富山'] },
  { name: '近畿', prefs: ['大阪', '京都', '奈良', '和歌山'] },
  { name: '中国', prefs: ['岡山', '広島', '山口'] },
  { name: '四国', prefs: ['香川', '徳島', '愛媛', '高知'] },
  { name: '九州', prefs: ['福岡', '熊本', '大分', '長崎'] },
];
const BOAT_BRANCHES = ['東京', '埼玉', '静岡', '愛知', '三重', '大阪', '兵庫', '岡山', '広島', '山口', '福岡', '佐賀', '長崎'];

export type HorseStyle = '逃げ' | '先行' | '差し' | '追込';
export type KeirinStyle = '逃' | '両' | '追';

export interface Runner {
  index: number;
  /** 馬番・車番・艇番 */
  no: number;
  /** 枠番（競馬は 1〜8、競輪は 1〜6、ボートは艇番と同じ） */
  frame: number;
  name: string;
  /** 強さ（対数）。着順の決まりやすさ */
  strength: number;
  /** 予想の印（◎○▲△☆ なし） */
  mark: string;
  /** 脚質（競馬・競輪） */
  style: string;
  /** 出走表に出す項目 */
  info: Record<string, string>;
  /** 馬の毛色 */
  coat?: string;
  /** 競輪のライン番号と、ラインの中の順番（0 が先頭＝先行役） */
  line?: number;
  linePos?: number;
}

export interface Race {
  id: string;
  kind: RaceKind;
  no: number;
  venue: string;
  /** レース名（未勝利、一般戦など） */
  name: string;
  /** 距離（m） */
  distance: number;
  /** 芝・ダート（競馬） */
  surface?: '芝' | 'ダート';
  /** 馬場状態・水面 */
  condition: string;
  /** 周回数（競輪・ボート） */
  laps?: number;
  seed: number;
  runners: Runner[];
  /** 競輪の並び予想（ラインごとの車番） */
  lines?: number[][];
}

/** 競馬の枠番。9頭以上は外の枠から2頭ずつ入る（JRA と同じ割り振り） */
export function horseFrames(n: number): number[] {
  const perFrame = Array(8).fill(Math.floor(n / 8));
  for (let f = 7, extra = n % 8; extra > 0; f--, extra--) perFrame[f]++;
  if (n < 8) return Array.from({ length: n }, (_, i) => i + 1);
  const frames: number[] = [];
  perFrame.forEach((c, f) => {
    for (let k = 0; k < c; k++) frames.push(f + 1);
  });
  return frames;
}

/** 競輪の枠番（9車立ては 1・2・3・4-5・6-7・8-9 の6枠） */
export function keirinFrames(n: number): number[] {
  const table: Record<number, number[]> = {
    7: [1, 2, 3, 4, 5, 6, 6],
    9: [1, 2, 3, 4, 4, 5, 5, 6, 6],
  };
  return table[n] ?? Array.from({ length: n }, (_, i) => Math.min(i + 1, 6));
}

function uniqueName(used: Set<string>, make: () => string): string {
  let name = make();
  for (let tries = 0; used.has(name) && tries < 50; tries++) name = make();
  used.add(name);
  return name;
}

const fmt = (v: number, d = 2) => v.toFixed(d);

export function makeRace(kind: RaceKind, no: number, seed: number): Race {
  const rng = seeded(seed);
  const used = new Set<string>();
  const venue = pick(rng, RACES[kind].venues);
  const runners: Runner[] = [];

  if (kind === 'horse') {
    const n = 8 + randInt(rng, 11); // 8〜18頭
    const surface: '芝' | 'ダート' = rng() < 0.6 ? '芝' : 'ダート';
    const distance = pick(rng, surface === '芝' ? [1200, 1400, 1600, 1800, 2000, 2400] : [1200, 1400, 1600, 1800]);
    const frames = horseFrames(n);
    const age = 2 + randInt(rng, 4);
    const styles: HorseStyle[] = ['逃げ', '先行', '先行', '差し', '差し', '追込'];
    for (let i = 0; i < n; i++) {
      const strength = gauss(rng) * 0.75;
      const sex = pick(rng, ['牡', '牡', '牝', 'セ']);
      const coat = pick(rng, COATS);
      const weight = 440 + randInt(rng, 80);
      const diff = randInt(rng, 17) - 8;
      runners.push({
        index: i,
        no: i + 1,
        frame: frames[i],
        name: uniqueName(used, () => pick(rng, HORSE_A) + pick(rng, HORSE_B)),
        strength,
        mark: '',
        style: pick(rng, styles),
        coat: coat.color,
        info: {
          性齢: `${sex}${age}`,
          斤量: (sex === '牝' ? 55 : 57).toFixed(1),
          騎手: `${pick(rng, FAMILY)}${pick(rng, ['', '', '★', '▲'])}`,
          馬体重: `${weight}(${diff > 0 ? '+' : ''}${diff})`,
          毛色: coat.name,
        },
      });
    }
    // 逃げ馬がいないレースは、いちばん前に行きたがる馬を逃げにする
    if (!runners.some((r) => r.style === '逃げ')) runners[randInt(rng, n)].style = '逃げ';
    const race: Race = {
      id: `horse-${seed}`,
      kind,
      no,
      venue,
      name: pick(rng, ['2歳未勝利', '3歳未勝利', '1勝クラス', '2勝クラス', '3勝クラス', 'オープン', 'ステークス(G3)']),
      distance,
      surface,
      condition: pick(rng, ['良', '良', '良', '稍重', '重', '不良']),
      seed,
      runners,
    };
    addMarks(race, rng);
    return race;
  }

  if (kind === 'keirin') {
    const n = rng() < 0.75 ? 9 : 7;
    const frames = keirinFrames(n);
    // ラインを組む（3・3・3 や 4・3・2 など）
    const sizes = n === 9 ? pick(rng, [[3, 3, 3], [4, 3, 2], [3, 3, 2, 1], [4, 2, 2, 1]]) : pick(rng, [[3, 2, 2], [3, 3, 1], [4, 3]]);
    const regions = [...REGIONS].sort(() => rng() - 0.5).slice(0, sizes.length);
    const members: { line: number; pos: number; region: (typeof REGIONS)[number] }[] = [];
    sizes.forEach((size, line) => {
      for (let p = 0; p < size; p++) members.push({ line, pos: p, region: regions[line] });
    });
    // 車番はラインと関係なく割り振られる
    const order = members.map((_, i) => i).sort(() => rng() - 0.5);
    for (let i = 0; i < n; i++) {
      const m = members[order[i]];
      const strength = gauss(rng) * 0.6 + (m.pos === 0 ? 0.1 : m.pos === 1 ? 0.15 : -0.05);
      const style: KeirinStyle = m.pos === 0 ? '逃' : m.pos === 1 ? pick(rng, ['両', '追']) : '追';
      runners.push({
        index: i,
        no: i + 1,
        frame: frames[i],
        name: uniqueName(used, () => `${pick(rng, FAMILY)} ${pick(rng, GIVEN)}`),
        strength,
        mark: '',
        style,
        line: m.line,
        linePos: m.pos,
        info: {
          府県: pick(rng, m.region.prefs),
          年齢: String(22 + randInt(rng, 25)),
          級班: pick(rng, ['S1', 'S2', 'A1', 'A2']),
          脚質: style,
          競走得点: fmt(95 + strength * 6 + gauss(rng) * 1.5),
        },
      });
    }
    const lines = sizes.map((_, line) =>
      runners.filter((r) => r.line === line).sort((a, b) => a.linePos! - b.linePos!).map((r) => r.no),
    );
    const race: Race = {
      id: `keirin-${seed}`,
      kind,
      no,
      venue,
      name: pick(rng, ['A級予選', 'A級特選', 'S級一次予選', 'S級二次予選', 'S級特選', 'S級準決勝']),
      distance: 2025,
      laps: 5,
      condition: pick(rng, ['晴', '晴', '曇', '雨']),
      seed,
      runners,
      lines,
    };
    addMarks(race, rng);
    return race;
  }

  // ボートレース：6艇。内側のコースほど有利（1コースの1着率は実際も5割前後）
  const LANE = [1.75, 0.45, 0.25, 0.1, -0.15, -0.4];
  for (let i = 0; i < 6; i++) {
    const skill = gauss(rng) * 0.5;
    const motor = gauss(rng) * 0.25;
    const grade = skill > 0.45 ? 'A1' : skill > 0 ? 'A2' : skill > -0.6 ? 'B1' : 'B2';
    runners.push({
      index: i,
      no: i + 1,
      frame: i + 1,
      name: uniqueName(used, () => `${pick(rng, FAMILY)} ${pick(rng, GIVEN)}`),
      strength: skill + motor + LANE[i],
      mark: '',
      style: '',
      info: {
        級別: grade,
        支部: pick(rng, BOAT_BRANCHES),
        全国勝率: fmt(5.4 + skill * 1.6 + gauss(rng) * 0.3),
        モーター2連率: `${fmt(34 + motor * 30 + gauss(rng) * 4, 1)}%`,
        展示: fmt(6.78 - motor * 0.12 + gauss(rng) * 0.04),
      },
    });
  }
  const race: Race = {
    id: `boat-${seed}`,
    kind,
    no,
    venue,
    name: pick(rng, ['一般戦', '予選', '準優勝戦', '優勝戦']),
    distance: 1800,
    laps: 3,
    condition: `${pick(rng, ['晴', '曇', '雨'])} 風${randInt(rng, 6)}m 波${randInt(rng, 5)}cm`,
    seed,
    runners,
  };
  addMarks(race, rng);
  return race;
}

/** 新聞の予想の印。本当の強さに少しぶれを足した順位で付ける */
function addMarks(race: Race, rng: Rng) {
  const marks = ['◎', '○', '▲', '△', '△', '☆'];
  const view = race.runners.map((r) => ({ r, v: r.strength + gauss(rng) * 0.35 })).sort((a, b) => b.v - a.v);
  view.forEach(({ r }, i) => (r.mark = marks[i] ?? ''));
}

// ---- 確率 ----

export interface Probs {
  n: number;
  win: number[];
  /** 複勝が当たる着順（何着まで） */
  placeCount: number;
  place: number[];
  /** [i*n+j]：1着 i・2着 j */
  exacta: Float64Array;
  /** [(i*n+j)*n+k]：1着 i・2着 j・3着 k */
  trifecta: Float64Array;
}

/** 複勝が何着までか（JRA：8頭以上は3着、5〜7頭は2着。ボートは6艇で2着） */
export function placeCount(race: Race): number {
  if (race.kind === 'boat') return 2;
  if (race.kind === 'keirin') return 0;
  return race.runners.length >= 8 ? 3 : race.runners.length >= 5 ? 2 : 0;
}

export function computeProbs(race: Race): Probs {
  const n = race.runners.length;
  const w = race.runners.map((r) => Math.exp(r.strength));
  const W = w.reduce((a, b) => a + b, 0);
  const win = w.map((x) => x / W);
  const exacta = new Float64Array(n * n);
  const trifecta = new Float64Array(n * n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const pij = win[i] * (w[j] / (W - w[i]));
      exacta[i * n + j] = pij;
      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        trifecta[(i * n + j) * n + k] = pij * (w[k] / (W - w[i] - w[j]));
      }
    }
  }
  const pc = placeCount(race);
  const place = Array(n).fill(0);
  if (pc === 2) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) {
      place[i] += exacta[i * n + j];
      place[j] += exacta[i * n + j];
    }
  } else if (pc === 3) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
      const p = trifecta[(i * n + j) * n + k];
      if (!p) continue;
      place[i] += p;
      place[j] += p;
      place[k] += p;
    }
  }
  return { n, win, placeCount: pc, place, exacta, trifecta };
}

/** 買い目（combo）が当たる確率。combo は runner の index（枠連・2枠複は枠番） */
export function comboProb(race: Race, pr: Probs, type: BetType, combo: number[]): number {
  const { n } = pr;
  const ex = (i: number, j: number) => pr.exacta[i * n + j];
  const tri = (i: number, j: number, k: number) => pr.trifecta[(i * n + j) * n + k];
  const [a, b, c] = combo;
  switch (type) {
    case 'win':
      return pr.win[a];
    case 'place':
      return pr.place[a];
    case 'exacta':
      return a === b ? 0 : ex(a, b);
    case 'quinella':
      return a === b ? 0 : ex(a, b) + ex(b, a);
    case 'trifecta':
      return a === b || b === c || a === c ? 0 : tri(a, b, c);
    case 'trio': {
      if (a === b || b === c || a === c) return 0;
      return tri(a, b, c) + tri(a, c, b) + tri(b, a, c) + tri(b, c, a) + tri(c, a, b) + tri(c, b, a);
    }
    case 'wide': {
      if (a === b) return 0;
      let p = 0;
      for (let k = 0; k < n; k++) {
        if (k === a || k === b) continue;
        p += tri(a, b, k) + tri(b, a, k) + tri(a, k, b) + tri(b, k, a) + tri(k, a, b) + tri(k, b, a);
      }
      return p;
    }
    case 'bracket': {
      const inF = (f: number) => race.runners.filter((r) => r.frame === f).map((r) => r.index);
      const fa = inF(a);
      const fb = inF(b);
      let p = 0;
      // 同じ枠どうし（7-7 など）は i,j を両方の順で数えるので、それで 1着・2着の両方の並びが入る
      for (const i of fa) for (const j of fb) if (i !== j) p += ex(i, j) + (a === b ? 0 : ex(j, i));
      return p;
    }
  }
}

/** オッズ（倍）。払戻率 ÷ 確率を 0.1 倍単位で切り捨て、最低 1.0 倍（100円元返し） */
export function oddsOf(rate: number, p: number): number | null {
  if (!(p > 0)) return null;
  return Math.min(99999.9, Math.max(1, Math.floor((rate / p) * 10 + 1e-9) / 10));
}

export function comboOdds(race: Race, pr: Probs, type: BetType, combo: number[]): number | null {
  const rate = RACES[race.kind].payout[type];
  if (rate === undefined) return null;
  return oddsOf(rate, comboProb(race, pr, type, combo));
}

// ---- 買い目 ----

export interface Ticket {
  type: BetType;
  combo: number[];
  /** 1点あたりの金額（100円単位） */
  stake: number;
}

export type BuyMethod = 'normal' | 'nagashi';

/**
 * 選んだ番号から買い目を作る。
 * - normal：順番を問う券種（単勝・複勝・馬単・3連単）はフォーメーション（着順ごとの列の掛け合わせ）、
 *   順番を問わない券種はボックス（選んだ中の組み合わせ全部）
 * - nagashi：軸（cols[0] の1つ）と相手（cols[1]）。順番を問う券種は軸を1着に固定
 */
export function expandCombos(race: Race, type: BetType, method: BuyMethod, cols: number[][]): number[][] {
  const { k, ordered } = BET_SHAPE[type];
  const out: number[][] = [];
  const seen = new Set<string>();
  const add = (c: number[]) => {
    const key = (ordered ? c : [...c].sort((x, y) => x - y)).join('-');
    if (seen.has(key)) return;
    seen.add(key);
    out.push(ordered ? c : [...c].sort((x, y) => x - y));
  };
  const sameAllowed = type === 'bracket';
  const frameSize = (f: number) => race.runners.filter((r) => r.frame === f).length;
  const valid = (c: number[]) => {
    if (sameAllowed) return c[0] !== c[1] || frameSize(c[0]) >= 2;
    return new Set(c).size === c.length;
  };
  if (k === 1) {
    for (const i of cols[0] ?? []) add([i]);
    return out;
  }
  if (method === 'nagashi') {
    const axis = cols[0]?.[0];
    const partners = cols[1] ?? [];
    if (axis === undefined) return out;
    if (ordered) {
      for (const p of permutations(partners, k - 1)) if (valid([axis, ...p])) add([axis, ...p]);
    } else {
      for (const p of combinations(partners, k - 1)) if (valid([axis, ...p])) add([axis, ...p]);
    }
    return out;
  }
  if (ordered) {
    const rec = (prefix: number[], pos: number) => {
      if (pos === k) {
        if (valid(prefix)) add(prefix);
        return;
      }
      for (const i of cols[pos] ?? []) rec([...prefix, i], pos + 1);
    };
    rec([], 0);
    return out;
  }
  const set = cols[0] ?? [];
  for (const c of combinations(set, k)) if (valid(c)) add(c);
  // 枠連のボックスは、2頭以上いる枠のゾロ目（7-7 など）も含める
  if (sameAllowed) for (const f of set) if (frameSize(f) >= 2) add([f, f]);
  return out;
}

function combinations(list: number[], k: number): number[][] {
  if (k === 0) return [[]];
  const out: number[][] = [];
  list.forEach((x, i) => {
    for (const rest of combinations(list.slice(i + 1), k - 1)) out.push([x, ...rest]);
  });
  return out;
}

function permutations(list: number[], k: number): number[][] {
  if (k === 0) return [[]];
  const out: number[][] = [];
  list.forEach((x, i) => {
    for (const rest of permutations([...list.slice(0, i), ...list.slice(i + 1)], k - 1)) out.push([x, ...rest]);
  });
  return out;
}

/** 買い目の表示（馬単・3連単は →、ほかは -。枠連は枠番） */
export function comboLabel(race: Race, type: BetType, combo: number[]): string {
  const sep = BET_SHAPE[type].ordered ? '→' : '-';
  return combo.map((i) => (type === 'bracket' ? i : race.runners[i].no)).join(sep);
}

// ---- 結果 ----

/** 着順を決める（強さに比例した確率で1着から順に） */
export function drawOrder(race: Race, rng: Rng): number[] {
  const left = race.runners.map((r) => ({ i: r.index, w: Math.exp(r.strength) }));
  const order: number[] = [];
  while (left.length) {
    const W = left.reduce((a, b) => a + b.w, 0);
    let x = rng() * W;
    let k = 0;
    while (k < left.length - 1 && x >= left[k].w) x -= left[k++].w;
    order.push(left[k].i);
    left.splice(k, 1);
  }
  return order;
}

export function ticketHits(race: Race, order: number[], t: Pick<Ticket, 'type' | 'combo'>): boolean {
  const c = t.combo;
  const top = (m: number) => order.slice(0, m);
  const sameSet = (a: number[], b: number[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  switch (t.type) {
    case 'win':
      return order[0] === c[0];
    case 'place':
      return top(placeCount(race)).includes(c[0]);
    case 'exacta':
      return order[0] === c[0] && order[1] === c[1];
    case 'trifecta':
      return order[0] === c[0] && order[1] === c[1] && order[2] === c[2];
    case 'quinella':
      return sameSet(top(2), c);
    case 'trio':
      return sameSet(top(3), c);
    case 'wide':
      return c[0] !== c[1] && top(3).includes(c[0]) && top(3).includes(c[1]);
    case 'bracket':
      return sameSet(top(2).map((i) => race.runners[i].frame), c);
  }
}

/** 100円あたりの払戻金 */
export function payoutPer100(odds: number): number {
  return Math.round(odds * 100);
}

/** 払戻金（はずれは 0） */
export function ticketPayout(race: Race, pr: Probs, order: number[], t: Ticket): number {
  if (!ticketHits(race, order, t)) return 0;
  const odds = comboOdds(race, pr, t.type, t.combo) ?? 0;
  return Math.floor((t.stake / 100) * payoutPer100(odds));
}

/** 当たった買い目の一覧（払戻金の掲示板用） */
export function winningCombos(race: Race, order: number[]): { type: BetType; combo: number[] }[] {
  const cfg = RACES[race.kind];
  const [a, b, c] = order;
  const out: { type: BetType; combo: number[] }[] = [];
  for (const type of cfg.bets) {
    switch (type) {
      case 'win':
        out.push({ type, combo: [a] });
        break;
      case 'place':
        for (const i of order.slice(0, placeCount(race))) out.push({ type, combo: [i] });
        break;
      case 'bracket': {
        const f = [race.runners[a].frame, race.runners[b].frame].sort((x, y) => x - y);
        out.push({ type, combo: f });
        break;
      }
      case 'quinella':
        out.push({ type, combo: [a, b].sort((x, y) => x - y) });
        break;
      case 'wide':
        for (const p of [[a, b], [a, c], [b, c]]) out.push({ type, combo: p.sort((x, y) => x - y) });
        break;
      case 'exacta':
        out.push({ type, combo: [a, b] });
        break;
      case 'trio':
        out.push({ type, combo: [a, b, c].sort((x, y) => x - y) });
        break;
      case 'trifecta':
        out.push({ type, combo: [a, b, c] });
        break;
    }
  }
  return out;
}

/** 人気順（確率の高い順）の買い目。上位 limit 件 */
export function popularCombos(race: Race, pr: Probs, type: BetType, limit = 10): { combo: number[]; p: number }[] {
  let all: number[][];
  const idx = race.runners.map((r) => r.index);
  if (type === 'bracket') {
    const frames = [...new Set(race.runners.map((r) => r.frame))];
    all = expandCombos(race, type, 'normal', [frames]);
  } else if (BET_SHAPE[type].k === 1) all = idx.map((i) => [i]);
  else all = expandCombos(race, type, 'normal', BET_SHAPE[type].ordered ? Array(BET_SHAPE[type].k).fill(idx) : [idx]);
  return all
    .map((combo) => ({ combo, p: comboProb(race, pr, type, combo) }))
    .sort((x, y) => y.p - x.p)
    .slice(0, limit);
}
