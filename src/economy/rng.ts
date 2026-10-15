// 乱数。テストで結果を固定できるよう、ゲームのルール側は乱数関数を引数で受け取る。

/** 0 以上 1 未満を返す関数 */
export type Rng = () => number;

/** 種から決まった並びを出す乱数（mulberry32） */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const defaultRng: Rng = Math.random;

/** 0..n-1 の整数 */
export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** 標準正規分布（Box-Muller） */
export function gauss(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[randInt(rng, list.length)];
}
