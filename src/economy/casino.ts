// カジノのゲーム（スロット、ルーレット、ハイ＆ロー）。期待値は少しマイナスにして、バイトの価値を守る。
import type { Rng } from './rng';
import { randInt } from './rng';

// ---- スロット ----

export type SlotSymbol = 'seven' | 'bar' | 'bell' | 'melon' | 'cherry' | 'lemon';

export const SLOT_FACES: Record<SlotSymbol, string> = {
  seven: '7',
  bar: 'BAR',
  bell: '🔔',
  melon: '🍉',
  cherry: '🍒',
  lemon: '🍋',
};

/** 1本のリールに並ぶ絵柄の数（3本とも同じ） */
export const SLOT_REEL: Record<SlotSymbol, number> = { seven: 1, bar: 2, bell: 3, melon: 4, cherry: 3, lemon: 7 };

/** 3つそろったときの倍率 */
export const SLOT_PAYS: Record<Exclude<SlotSymbol, 'cherry'>, number> = { seven: 1000, bar: 200, bell: 50, melon: 15, lemon: 4 };
/** 左のリールにチェリーが出たら賭け金が戻る */
export const CHERRY_PAY = 1;

const REEL_STRIP: SlotSymbol[] = (Object.entries(SLOT_REEL) as [SlotSymbol, number][]).flatMap(([s, n]) =>
  Array<SlotSymbol>(n).fill(s),
);

export function spinSlots(rng: Rng): [SlotSymbol, SlotSymbol, SlotSymbol] {
  return [0, 1, 2].map(() => REEL_STRIP[randInt(rng, REEL_STRIP.length)]) as [SlotSymbol, SlotSymbol, SlotSymbol];
}

/** 出目の倍率（0 ははずれ） */
export function slotMultiplier(r: readonly SlotSymbol[]): number {
  if (r[0] === 'cherry') return CHERRY_PAY;
  if (r[0] === r[1] && r[1] === r[2]) return SLOT_PAYS[r[0] as Exclude<SlotSymbol, 'cherry'>];
  return 0;
}

/** 還元率（全部の出目を数えた期待値） */
export function slotReturnRate(): number {
  const n = REEL_STRIP.length;
  let total = 0;
  for (const a of REEL_STRIP) for (const b of REEL_STRIP) for (const c of REEL_STRIP) total += slotMultiplier([a, b, c]);
  return total / n ** 3;
}

export const REEL_SYMBOLS = REEL_STRIP;

// ---- ルーレット（ヨーロピアン、0 が1つ） ----

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type RouletteBet =
  | { kind: 'red' }
  | { kind: 'black' }
  | { kind: 'odd' }
  | { kind: 'even' }
  | { kind: 'low' }
  | { kind: 'high' }
  | { kind: 'dozen'; dozen: 1 | 2 | 3 }
  | { kind: 'number'; number: number };

export function rouletteColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return REDS.has(n) ? 'red' : 'black';
}

export function spinRoulette(rng: Rng): number {
  return randInt(rng, 37);
}

/** 当たったときに戻ってくる倍率（賭け金込み）。はずれは 0 */
export function roulettePayout(bet: RouletteBet, n: number): number {
  if (n === 0) return bet.kind === 'number' && bet.number === 0 ? 36 : 0;
  switch (bet.kind) {
    case 'red':
      return REDS.has(n) ? 2 : 0;
    case 'black':
      return REDS.has(n) ? 0 : 2;
    case 'odd':
      return n % 2 === 1 ? 2 : 0;
    case 'even':
      return n % 2 === 0 ? 2 : 0;
    case 'low':
      return n <= 18 ? 2 : 0;
    case 'high':
      return n >= 19 ? 2 : 0;
    case 'dozen':
      return Math.ceil(n / 12) === bet.dozen ? 3 : 0;
    case 'number':
      return n === bet.number ? 36 : 0;
  }
}

export function rouletteBetName(bet: RouletteBet): string {
  switch (bet.kind) {
    case 'red':
      return '赤';
    case 'black':
      return '黒';
    case 'odd':
      return '奇数';
    case 'even':
      return '偶数';
    case 'low':
      return '1〜18';
    case 'high':
      return '19〜36';
    case 'dozen':
      return `${(bet.dozen - 1) * 12 + 1}〜${bet.dozen * 12}`;
    case 'number':
      return `${bet.number} 一点`;
  }
}

// ---- ハイ＆ロー（トランプの A〜K。同じ数字は負け） ----

export const CARD_RANKS = 13;
const HOUSE_RATE = 0.95;

export function drawCard(rng: Rng): number {
  return randInt(rng, CARD_RANKS) + 1;
}

export function cardName(rank: number): string {
  return ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[rank] ?? String(rank);
}

/** ハイ／ローを当てたときの倍率。当たる見込みがないなら 0 */
export function highLowMultiplier(current: number, guess: 'high' | 'low'): number {
  const wins = guess === 'high' ? CARD_RANKS - current : current - 1;
  if (wins <= 0) return 0;
  return Math.floor(((HOUSE_RATE * CARD_RANKS) / wins) * 100) / 100;
}

export function highLowWins(current: number, next: number, guess: 'high' | 'low'): boolean {
  return guess === 'high' ? next > current : next < current;
}
