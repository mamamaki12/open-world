// プレイヤーが部品を組み合わせてデザインする家具。形は既存の家具と同じ FurnitureDef。
// ライブラリは家とは別に保存するので、将来お店の商品としてそのまま渡せる。
import { create } from 'zustand';
import { registerDesign } from './index';
import type { FurnitureDef, FurniturePiece, Paint } from './index';

export const DESIGN_PREFIX = 'design:';
const STORAGE_KEY = 'open-world:furniture-designs';
export const MAX_PARTS = 40;

export const PAINTS: { id: Paint; name: string }[] = [
  { id: 'main', name: 'メイン色' },
  { id: 'wood', name: '木' },
  { id: 'white', name: '白' },
  { id: 'black', name: '黒（つや）' },
  { id: 'dark', name: 'グレー' },
  { id: 'accent', name: 'レザー' },
  { id: 'steel', name: 'ステンレス' },
  { id: 'counter', name: '人工大理石' },
  { id: 'stone', name: '石' },
  { id: 'green', name: '植物' },
];

/** 追加できる部品。大きさ・位置はあとで自由に変えられる */
export const PART_KINDS: { id: string; name: string; piece: FurniturePiece }[] = [
  { id: 'board', name: '板', piece: { shape: 'box', size: [0.8, 0.03, 0.4], pos: [0, 0.7, 0], paint: 'wood' } },
  { id: 'leg', name: '脚（角）', piece: { shape: 'box', size: [0.04, 0.7, 0.04], pos: [0, 0.35, 0], paint: 'wood' } },
  { id: 'round-leg', name: '脚（丸）', piece: { shape: 'cylinder', size: [0.05, 0.7, 0.05], pos: [0, 0.35, 0], paint: 'steel' } },
  { id: 'drawer', name: '引き出し', piece: { shape: 'box', size: [0.5, 0.18, 0.4], pos: [0, 0.3, 0], paint: 'main', move: 'drawer' } },
  { id: 'door-l', name: '扉（左が軸）', piece: { shape: 'box', size: [0.4, 0.6, 0.02], pos: [0, 0.4, 0.2], paint: 'main', move: 'door-l' } },
  { id: 'door-r', name: '扉（右が軸）', piece: { shape: 'box', size: [0.4, 0.6, 0.02], pos: [0, 0.4, 0.2], paint: 'main', move: 'door-r' } },
  { id: 'cushion', name: 'クッション', piece: { shape: 'box', size: [0.5, 0.1, 0.5], pos: [0, 0.45, 0], paint: 'main' } },
  { id: 'back', name: '背もたれ', piece: { shape: 'box', size: [0.5, 0.45, 0.06], pos: [0, 0.7, -0.22], paint: 'main' } },
  { id: 'ball', name: '球', piece: { shape: 'sphere', size: [0.2, 0.2, 0.2], pos: [0, 0.8, 0], paint: 'white' } },
];

const leg = (x: number, z: number, h: number, paint: Paint = 'wood'): FurniturePiece =>
  ({ shape: 'box', size: [0.04, h, 0.04], pos: [x, h / 2, z], paint });

/** はじめの形。ここから部品を足したり動かしたりする */
export const TEMPLATES: { name: string; def: Omit<FurnitureDef, 'id'> }[] = [
  { name: '何もない', def: { name: '新しい家具', colors: ['#c9b8a4'], parts: [] } },
  {
    name: '椅子',
    def: {
      name: 'わたしの椅子', colors: ['#7b8f6a'], seat: { height: 0.47, z: 0 },
      parts: [leg(-0.2, -0.2, 0.42), leg(0.2, -0.2, 0.42), leg(-0.2, 0.2, 0.42), leg(0.2, 0.2, 0.42),
        { shape: 'box', size: [0.46, 0.03, 0.46], pos: [0, 0.435, 0], paint: 'wood' },
        { shape: 'box', size: [0.44, 0.05, 0.44], pos: [0, 0.475, 0], paint: 'main' },
        { shape: 'box', size: [0.44, 0.42, 0.03], pos: [0, 0.72, -0.215], paint: 'wood' }],
    },
  },
  {
    name: 'テーブル',
    def: {
      name: 'わたしのテーブル', colors: ['#7a5535'],
      parts: [leg(-0.65, -0.35, 0.69), leg(0.65, -0.35, 0.69), leg(-0.65, 0.35, 0.69), leg(0.65, 0.35, 0.69),
        { shape: 'box', size: [1.4, 0.03, 0.8], pos: [0, 0.705, 0], paint: 'main' }],
    },
  },
  {
    name: 'チェスト',
    def: {
      name: 'わたしのチェスト', colors: ['#e9e4da'],
      parts: [
        { shape: 'box', size: [0.8, 0.8, 0.42], pos: [0, 0.42, -0.02], paint: 'wood' },
        { shape: 'box', size: [0.76, 0.22, 0.4], pos: [0, 0.17, 0.02], paint: 'main', move: 'drawer' },
        { shape: 'box', size: [0.76, 0.22, 0.4], pos: [0, 0.42, 0.02], paint: 'main', move: 'drawer' },
        { shape: 'box', size: [0.76, 0.22, 0.4], pos: [0, 0.67, 0.02], paint: 'main', move: 'drawer' },
      ],
    },
  },
  {
    name: '食器棚',
    def: {
      name: 'わたしの食器棚', colors: ['#5d6670'],
      parts: [
        { shape: 'box', size: [0.9, 1.8, 0.4], pos: [0, 0.9, -0.02], paint: 'wood' },
        { shape: 'box', size: [0.44, 1.7, 0.02], pos: [-0.22, 0.9, 0.19], paint: 'main', move: 'door-l' },
        { shape: 'box', size: [0.44, 1.7, 0.02], pos: [0.22, 0.9, 0.19], paint: 'main', move: 'door-r' },
      ],
    },
  },
  {
    name: 'ソファ',
    def: {
      name: 'わたしのソファ', colors: ['#9aa7b3'], seat: { height: 0.44, z: 0.05 },
      parts: [
        { shape: 'box', size: [1.6, 0.3, 0.8], pos: [0, 0.2, 0], paint: 'main' },
        { shape: 'box', size: [1.4, 0.12, 0.6], pos: [0, 0.38, 0.08], paint: 'main' },
        { shape: 'box', size: [1.6, 0.45, 0.18], pos: [0, 0.55, -0.31], paint: 'main' },
        { shape: 'box', size: [0.12, 0.3, 0.8], pos: [-0.74, 0.5, 0], paint: 'main' },
        { shape: 'box', size: [0.12, 0.3, 0.8], pos: [0.74, 0.5, 0], paint: 'main' },
        leg(-0.7, -0.32, 0.05, 'black'), leg(0.7, -0.32, 0.05, 'black'), leg(-0.7, 0.32, 0.05, 'black'), leg(0.7, 0.32, 0.05, 'black'),
      ],
    },
  },
];

const clamp = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
const vec = (v: unknown, lo: number, hi: number, fallback: number): [number, number, number] =>
  Array.isArray(v) ? [0, 1, 2].map((i) => +clamp(v[i], lo, hi, fallback).toFixed(3)) as [number, number, number] : [fallback, fallback, fallback];
const HEX = /^#[0-9a-f]{6}$/i;

/** 保存・受け取りのたびに形を整える（壊れたデータや巨大な家具を防ぐ） */
export function sanitizeDesign(raw: unknown): FurnitureDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<FurnitureDef>;
  if (typeof r.id !== 'string' || !r.id.startsWith(DESIGN_PREFIX) || r.id.length > 60) return null;
  const parts = (Array.isArray(r.parts) ? r.parts : []).slice(0, MAX_PARTS).flatMap((p): FurniturePiece[] => {
    if (!p || typeof p !== 'object') return [];
    const shape = (['box', 'cylinder', 'sphere'] as const).includes(p.shape) ? p.shape : 'box';
    const paint = PAINTS.some((x) => x.id === p.paint) ? p.paint : 'main';
    const piece: FurniturePiece = { shape, size: vec(p.size, 0.01, 3, 0.1), pos: vec(p.pos, -2, 3, 0), paint };
    if (p.move === 'drawer' || p.move === 'door-l' || p.move === 'door-r') piece.move = p.move;
    return [piece];
  });
  const colors = (Array.isArray(r.colors) ? r.colors : []).filter((c): c is string => typeof c === 'string' && HEX.test(c)).slice(0, 8);
  const def: FurnitureDef = {
    id: r.id,
    name: (typeof r.name === 'string' ? r.name : '').trim().slice(0, 30) || 'デザイン家具',
    colors: colors.length ? colors : ['#c9b8a4'],
    parts,
  };
  if (r.seat && typeof r.seat === 'object') def.seat = { height: +clamp(r.seat.height, 0.2, 1.2, 0.45).toFixed(3), z: +clamp(r.seat.z, -1, 1, 0).toFixed(3) };
  return def;
}

/** 部品の量と大きさで決まる値段（円）。動く部品は手間がかかるので少し高い */
export function designPrice(def: FurnitureDef): number {
  let yen = 5000;
  for (const p of def.parts) yen += 2000 + p.size[0] * p.size[1] * p.size[2] * 30000 + (p.move ? 4000 : 0);
  return Math.round(Math.min(yen, 2_000_000) / 1000) * 1000;
}

/** 座面の高さの目安：腰の高さまでにある一番上の面 */
export function guessSeatHeight(def: Pick<FurnitureDef, 'parts'>): number {
  let h = 0.45;
  let best = 0;
  for (const p of def.parts) {
    const top = p.pos[1] + p.size[1] / 2;
    if (top > 0.25 && top < 0.65 && p.size[0] > 0.3 && p.size[2] > 0.3 && top > best) best = top;
  }
  if (best) h = best;
  return +h.toFixed(3);
}

/** 置く家具に入れるデザイン（カタログの家具なら何も足さない） */
export function designOf(type: string): { design?: FurnitureDef } {
  if (!type.startsWith(DESIGN_PREFIX)) return {};
  const def = useDesigns.getState().designs.find((d) => d.id === type);
  return def ? { design: def } : {};
}

export function newDesignId() {
  return DESIGN_PREFIX + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function load(): FurnitureDef[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.map(sanitizeDesign).filter((d): d is FurnitureDef => !!d) : [];
  } catch {
    return [];
  }
}

function persist(designs: FurnitureDef[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
  } catch {
    // 保存できない環境（プライベートモードなど）でも遊べるようにする
  }
}

interface DesignLibrary {
  designs: FurnitureDef[];
  save: (def: FurnitureDef) => FurnitureDef | null;
  remove: (id: string) => void;
}

export const useDesigns = create<DesignLibrary>((set, get) => {
  const designs = typeof localStorage === 'undefined' ? [] : load();
  designs.forEach(registerDesign);
  return {
    designs,
    save: (raw) => {
      const def = sanitizeDesign(raw);
      if (!def) return null;
      registerDesign(def);
      const list = get().designs.some((d) => d.id === def.id)
        ? get().designs.map((d) => (d.id === def.id ? def : d))
        : [...get().designs, def];
      persist(list);
      set({ designs: list });
      return def;
    },
    remove: (id) => {
      const list = get().designs.filter((d) => d.id !== id);
      persist(list);
      set({ designs: list });
    },
  };
});

/** デザイン画面で編集中の家具（null なら閉じている） */
export function restoreDesigns(raw: FurnitureDef[]) {
  const designs = raw.map(sanitizeDesign).filter((d): d is FurnitureDef => !!d);
  designs.forEach(registerDesign); persist(designs); useDesigns.setState({ designs });
}

export const useDesigner = create<{ draft: FurnitureDef | null }>(() => ({ draft: null }));

