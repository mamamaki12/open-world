// みんなのワールドの家への「いいね」。いいねが多い家は査定（建物の評価）が上がる。描画に依存しない
export const LIKE_LIMIT = 500;
/** いいね1つで建物の査定が何割上がるか、と上限 */
export const LIKE_STEP = 0.01;
export const LIKE_MAX_BONUS = 0.5;

export function cleanLikes(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 100))].slice(0, LIKE_LIMIT) : [];
}

export function likeFactor(likes: unknown): number {
  return 1 + Math.min(LIKE_MAX_BONUS, cleanLikes(likes).length * LIKE_STEP);
}

/** いいねを付ける／外す。だめなら理由 */
export function toggleLike(lot: { owner?: string; built: unknown; likes?: unknown; town?: true }, who: string): string[] | string {
  if (lot.town) return '町の家にはいいねできません';
  if (!lot.built) return 'まだ家が建っていません';
  if (lot.owner === who) return '自分の家にはいいねできません';
  const list = cleanLikes(lot.likes);
  if (list.includes(who)) return list.filter((x) => x !== who);
  if (list.length >= LIKE_LIMIT) return 'いいねがいっぱいです';
  return [...list, who];
}

/** いいねの多い順 */
export function likeRanking<T extends { likes?: unknown; built: unknown; town?: true }>(lots: T[]): T[] {
  return lots.filter((l) => l.built && !l.town).sort((a, b) => cleanLikes(b.likes).length - cleanLikes(a.likes).length);
}
