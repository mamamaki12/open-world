// 設計図：家（House）をまるごと保存して、ほかの土地にそのまま建てる・コードにして人に渡す・お店で売る。
// 階のコピー（いまの階をいちばん上に重ねる）もここ。描画に依存しない。
import type { House } from './types';
import { GRID, MAX_LEVEL } from './dimensions';
import { newId } from './rules';
import { isHouse } from '../save/storage';

export interface Blueprint { id: string; name: string; savedAt: number; house: House }

export const BLUEPRINT_LIMITS = { count: 20, name: 24, code: 60_000 };
const KEY = 'open-world:blueprints:v1';
const PREFIX = 'OW1.';

export function loadBlueprints(): Blueprint[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((b) => b && typeof b.id === 'string' && typeof b.name === 'string' && isHouse(b.house)) : [];
  } catch { return []; }
}

export function storeBlueprints(list: Blueprint[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, BLUEPRINT_LIMITS.count))); return true; } catch { return false; }
}

export function partCount(h: House): number {
  return h.floors.length + h.walls.length + h.openings.length + h.stairs.length + h.roofs.length + h.furniture.length;
}

/** 家が使っているマスの範囲（グリッド点）。何もなければ null */
export function houseBounds(h: House): { x1: number; z1: number; x0: number; z0: number } | null {
  const xs: number[] = [], zs: number[] = [];
  for (const r of [...h.floors, ...h.walls, ...h.roofs]) { xs.push(r.x0, r.x1); zs.push(r.z0, r.z1); }
  for (const s of h.stairs) { xs.push(s.x); zs.push(s.z); }
  for (const f of h.furniture) { xs.push(f.x / GRID); zs.push(f.z / GRID); }
  if (!xs.length) return null;
  return { x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) };
}

/** その広さの土地に収まるか。収まらなければ理由 */
export function fitError(h: House, cells: { w: number; d: number }): string | null {
  const b = houseBounds(h);
  if (!b) return '設計図が空です';
  if (b.x0 < 0 || b.z0 < 0 || b.x1 > cells.w || b.z1 > cells.d) return `この土地には収まりません（横${Math.ceil(b.x1)}×奥${Math.ceil(b.z1)}マス必要、土地は${cells.w}×${cells.d}マス）`;
  return null;
}

const toB64 = (bytes: Uint8Array) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(out);
}

/** 設計図を人に渡せる文字（コード）にする */
export async function encodeBlueprint(name: string, house: House): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ n: name.slice(0, BLUEPRINT_LIMITS.name), h: house }));
  return PREFIX + toB64(await pipe(json, new CompressionStream('deflate-raw')));
}

export const looksLikeCode = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= BLUEPRINT_LIMITS.code && v.startsWith(PREFIX) && /^[A-Za-z0-9+/=]+$/.test(v.slice(PREFIX.length));

/** コードから設計図に戻す。読めなければ null */
export async function decodeBlueprint(code: string): Promise<{ name: string; house: House } | null> {
  const c = code.trim();
  if (!looksLikeCode(c)) return null;
  try {
    const raw = await pipe(fromB64(c.slice(PREFIX.length)), new DecompressionStream('deflate-raw'));
    const v = JSON.parse(new TextDecoder().decode(raw));
    if (!isHouse(v?.h)) return null;
    return { name: typeof v.n === 'string' && v.n.trim() ? v.n.slice(0, BLUEPRINT_LIMITS.name) : '設計図', house: v.h };
  } catch { return null; }
}

/** 階をまるごといちばん上に重ねる（床・壁・窓とドア・家具）。いちばん上の階にかかっていた屋根は新しい階へ上げる */
export function copyLevelOnTop(h: House, from: number): House | string {
  const top = h.floors.reduce((m, f) => Math.max(m, f.level), -1);
  if (!h.floors.some((f) => f.level === from)) return 'その階には床がありません';
  const to = top + 1;
  if (to > MAX_LEVEL) return `${MAX_LEVEL + 1}階建てより高くはできません`;
  const wallIds = new Map<string, string>();
  const walls = h.walls.filter((w) => w.level === from).map((w) => { const id = newId('wall'); wallIds.set(w.id, id); return { ...w, id, level: to }; });
  const openings = h.openings.filter((o) => wallIds.has(o.wallId)).map((o) => ({ ...o, id: newId('opening'), wallId: wallIds.get(o.wallId)! }));
  const furniture = h.furniture.filter((f) => f.level === from && (!f.wallMount || wallIds.has(f.wallMount.wallId)))
    .map((f) => ({ ...f, id: newId('furniture'), level: to, ...(f.wallMount ? { wallMount: { ...f.wallMount, wallId: wallIds.get(f.wallMount.wallId)! } } : {}) }));
  const floors = h.floors.filter((f) => f.level === from).map((f) => ({ ...f, id: newId('floor'), level: to }));
  return {
    ...h,
    floors: [...h.floors, ...floors],
    walls: [...h.walls, ...walls],
    openings: [...h.openings, ...openings],
    furniture: [...h.furniture, ...furniture],
    roofs: h.roofs.map((r) => (r.level === top ? { ...r, level: to } : r)),
  };
}
