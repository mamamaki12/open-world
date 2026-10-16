import type { House } from '../building/types';
import { renovationCost } from '../economy/pricing';
export const PARTS = ['floors', 'walls', 'openings', 'stairs', 'roofs', 'furniture'] as const;
type Kind = typeof PARTS[number];
export interface Change { kind: Kind; id: string; before: unknown; after: unknown }
export function changes(before: House, after: House): Change[] {
  return PARTS.flatMap(kind => {
    const a = new Map(before[kind].map(p => [p.id, p])), b = new Map(after[kind].map(p => [p.id, p]));
    return [...new Set([...a.keys(), ...b.keys()])].flatMap(id => JSON.stringify(a.get(id)) === JSON.stringify(b.get(id)) ? [] :
      [{ kind, id, before: a.get(id) ?? null, after: b.get(id) ?? null }]);
  });
}
/** Compare each affected part, so independent changes can merge without dropping either builder. */
export function applyChanges(house: House, delta: Change[]): House {
  if (!Array.isArray(delta) || !delta.length || delta.length > 3000) throw new Error('変更が大きすぎます');
  const result = JSON.parse(JSON.stringify(house)) as House, seen = new Set<string>();
  for (const c of delta) {
    if (!PARTS.includes(c.kind) || typeof c.id !== 'string' || c.id.length > 120 || seen.has(c.kind + c.id)) throw new Error('変更内容が不正です');
    seen.add(c.kind + c.id);
    const list = result[c.kind] as { id: string }[], i = list.findIndex(p => p.id === c.id), current = i < 0 ? null : list[i];
    if (JSON.stringify(current) !== JSON.stringify(c.before)) throw new Error('同じ部品が先に変更されました。最新状態でやり直してください');
    if (c.after === null) { if (i >= 0) list.splice(i, 1); }
    else {
      if (!c.after || typeof c.after !== 'object' || (c.after as { id: string }).id !== c.id) throw new Error('部品が不正です');
      if (i < 0) list.push(c.after as { id: string }); else list[i] = c.after as { id: string };
    }
  }
  if (result.openings.some(o => !result.walls.some(w => w.id === o.wallId))) throw new Error('ドア・窓の取り付け先が変わりました');
  // Reject malformed numeric payloads before pricing or rendering them.
  const scan = (v: unknown, depth = 0): void => {
    if (depth > 12) throw new Error('部品が不正です');
    if (typeof v === 'number' && (!Number.isFinite(v) || Math.abs(v) > 1e7)) throw new Error('数値が不正です');
    if (v && typeof v === 'object') Object.values(v).forEach(x => scan(x, depth + 1));
  };
  scan(result);
  const cost = renovationCost(house, result).total;
  if (!Number.isSafeInteger(cost) || cost < 0) throw new Error('費用を計算できません');
  return result;
}
