// 賃貸に出した家に住むNPCの住人。間取りの満足度で家賃が上下する。描画に依存しない
import type { House } from '../building/types';
import { quality } from './pricing';
import { houseStats } from './quests';

export interface Satisfaction { score: number; items: { label: string; ok: boolean; points: number }[]; residents: number; rentFactor: number }

export function satisfaction(house: House): Satisfaction {
  const s = houseStats(house);
  const q = quality(house).items;
  const ok = (label: string) => q.some((i) => i.label === label && i.ok);
  const residents = Math.max(1, Math.min(4, Math.floor(s.tatami / 12)));
  const items = [
    { label: `広さ（1人あたり10畳以上）`, ok: s.tatami >= residents * 10, points: 20 },
    { label: 'キッチン', ok: s.has('kitchen') || s.has('kitchen-island'), points: 15 },
    { label: 'お風呂', ok: s.has('bath'), points: 15 },
    { label: 'トイレ', ok: s.has('toilet'), points: 15 },
    { label: `ベッド`, ok: s.has('bed'), points: 10 },
    { label: '窓が十分ある', ok: ok('窓が十分ある（床15m²に1つ以上）'), points: 10 },
    { label: 'インテリアが充実', ok: ok('家具・インテリアが充実（4つ以上）'), points: 10 },
    { label: '屋根がかかっている', ok: ok('屋根がかかっている'), points: 5 },
  ];
  const score = items.reduce((a, i) => a + (i.ok ? i.points : 0), 0);
  // 0点で家賃6割、100点で1.4倍
  return { score, items, residents, rentFactor: Math.round((0.6 + score / 125) * 100) / 100 };
}

/** 住人の見た目と名前を土地ごとに決める（同じ土地なら毎回同じ） */
export function residentSeeds(lotId: string, n: number): number[] {
  let h = 2166136261;
  for (const c of lotId) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return Array.from({ length: n }, (_, i) => (Math.imul(h + i * 7919, 2654435761) >>> 0));
}
