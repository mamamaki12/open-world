// 選んだパーツの一部を書き換える
import type { House, PartKind } from '../building/types';
import { useGame } from '../state/store';

const LIST_KEY: Record<PartKind, keyof Omit<House, 'version'>> = {
  floor: 'floors',
  wall: 'walls',
  opening: 'openings',
  stair: 'stairs',
  roof: 'roofs',
  furniture: 'furniture',
};

export function patchPart(kind: PartKind, id: string, patch: Record<string, unknown>) {
  const s = useGame.getState();
  const key = LIST_KEY[kind];
  const list = s.house[key] as { id: string }[];
  const next = { ...s.house, [key]: list.map((p) => (p.id === id ? { ...p, ...patch } : p)) } as House;
  // 同じ項目を続けて変えたとき（スライダー・色選び）は1回の取り消しにまとめる
  s.commit(next, `${kind}:${id}:${Object.keys(patch).sort().join(',')}`);
}
