// 建築費の見積もり、改築の差額、家の査定（品質係数）。描画から独立した計算。
import prices from '../catalog/prices.json';
import { getSashType } from '../catalog';
import { GRID, WALL_HEIGHT } from '../building/dimensions';
import { wallLength, wallOutsideSide } from '../building/rules';
import type { House } from '../building/types';

const MATERIAL_PRICE = prices.materials as Record<string, number>;
const OPENING_PRICE = prices.openings as Record<string, number>;
const FURNITURE_PRICE = prices.furniture as Record<string, number>;

/** 構造の単価（円） */
export const STRUCTURE = {
  /** 1階の床（基礎こみ）、1m² あたり */
  groundFloor: 45000,
  /** 2階の床、1m² あたり */
  upperFloor: 30000,
  /** 壁の骨組み、壁面 1m² あたり */
  wall: 18000,
  /** 屋根の下地、屋根面 1m² あたり */
  roof: 15000,
  /** 階段1つ */
  stair: 400000,
  /** 階段1つの踏み板・蹴込み板の面積（m²）。木部の素材の単価をかける */
  stairFinishArea: 5,
};

export const materialPrice = (id: string) => MATERIAL_PRICE[id] ?? 8000;
export const openingPrice = (type: string) => OPENING_PRICE[type] ?? 80000;
export const furniturePrice = (type: string) => FURNITURE_PRICE[type] ?? 50000;

export type CostCategory = 'floor' | 'wall' | 'opening' | 'stair' | 'roof' | 'furniture';

export const COST_CATEGORY_NAMES: Record<CostCategory, string> = {
  floor: '床・基礎',
  wall: '壁',
  opening: 'ドア・窓',
  stair: '階段',
  roof: '屋根',
  furniture: '家具・設備',
};

export interface PartCost {
  category: CostCategory;
  id: string;
  cost: number;
  /** 中身が同じなら同じ値（改築の差額計算に使う） */
  key: string;
}

/** 家のパーツごとの値段 */
export function partCosts(house: House): PartCost[] {
  const out: PartCost[] = [];
  const area = (r: { x0: number; z0: number; x1: number; z1: number }) =>
    Math.abs(r.x1 - r.x0) * Math.abs(r.z1 - r.z0) * GRID * GRID;
  for (const f of house.floors) {
    const unit = (f.level === 0 ? STRUCTURE.groundFloor : STRUCTURE.upperFloor) + materialPrice(f.finish.material);
    out.push({ category: 'floor', id: f.id, cost: area(f) * unit, key: JSON.stringify(f) });
  }
  for (const w of house.walls) {
    const side = wallOutsideSide(house, w);
    // 屋外に面する側には外壁材、室内側には内装材がかかる
    const outsideFaces = side === 2 ? 2 : side === 0 ? 0 : 1;
    const finishUnit = outsideFaces * materialPrice(w.exterior.material) + (2 - outsideFaces) * materialPrice(w.interior.material);
    const face = wallLength(w) * WALL_HEIGHT;
    out.push({ category: 'wall', id: w.id, cost: face * (STRUCTURE.wall + finishUnit), key: JSON.stringify(w) });
  }
  for (const o of house.openings) {
    out.push({ category: 'opening', id: o.id, cost: openingPrice(o.type) * getSashType(o.sash).priceRate, key: JSON.stringify(o) });
  }
  for (const s of house.stairs) {
    out.push({ category: 'stair', id: s.id, cost: STRUCTURE.stair + STRUCTURE.stairFinishArea * materialPrice(s.finish.material), key: JSON.stringify(s) });
  }
  for (const r of house.roofs) {
    const w = Math.abs(r.x1 - r.x0) * GRID + 2 * r.overhang;
    const d = Math.abs(r.z1 - r.z0) * GRID + 2 * r.overhang;
    const slope = r.type === 'flat' ? 1 : Math.hypot(1, r.pitch / 10);
    const unit = STRUCTURE.roof + materialPrice(r.finish.material);
    out.push({ category: 'roof', id: r.id, cost: w * d * slope * unit, key: JSON.stringify(r) });
  }
  for (const f of house.furniture) {
    // 位置や向きを変えるだけならお金はかからない（種類と色だけを比べる）
    out.push({ category: 'furniture', id: f.id, cost: furniturePrice(f.type), key: `${f.type}:${f.color}` });
  }
  for (const p of out) p.cost = Math.round(p.cost / 1000) * 1000;
  return out;
}

export interface Estimate {
  total: number;
  byCategory: Record<CostCategory, number>;
  /** 対象のパーツ数 */
  parts: number;
}

function sum(list: PartCost[]): Estimate {
  const byCategory = { floor: 0, wall: 0, opening: 0, stair: 0, roof: 0, furniture: 0 } as Record<CostCategory, number>;
  let total = 0;
  for (const p of list) {
    byCategory[p.category] += p.cost;
    total += p.cost;
  }
  return { total, byCategory, parts: list.length };
}

/** 家をまるごと建てたときの建築費 */
export function estimateCost(house: House): Estimate {
  return sum(partCosts(house));
}

/**
 * 建っている家（built）から設計（design）にするための工事費。
 * 新しく足したパーツと、素材・色・種類を変えたパーツだけにかかる。取り壊しは無料（返金なし）。
 * 床を足すと隣の壁が外壁から内壁に変わるように、まわりの変化で値段が変わったパーツも工事に含める。
 */
export function renovationCost(built: House | null, design: House): Estimate {
  if (!built) return estimateCost(design);
  const before = new Map(partCosts(built).map((p) => [p.id, p]));
  const changed = partCosts(design).filter((p) => {
    const b = before.get(p.id);
    return !b || b.key !== p.key || (p.category === 'wall' && b.cost !== p.cost);
  });
  return sum(changed);
}

/** 設計と建っている家の家具の置き場所だけが違うか（工事なしでそのまま反映できる） */
export function sameStructure(a: House, b: House): boolean {
  return renovationCost(a, b).parts === 0 && renovationCost(b, a).parts === 0;
}

/** 工事にかかる時間（秒）。数十秒〜数分 */
export function buildSeconds(cost: number): number {
  return Math.round(Math.min(180, Math.max(15, 15 + (cost / 1_000_000) * 4)));
}

// ---- 査定 ----

export interface QualityItem {
  label: string;
  ok: boolean;
  /** 係数への寄与（ok のとき足す。マイナスは ok でないとき引く） */
  value: number;
}

export interface Quality {
  factor: number;
  items: QualityItem[];
}

/** 家の品質係数。設備がそろっていて、明るく、屋根がちゃんとかかっているほど高い */
export function quality(house: House): Quality {
  const has = (type: string) => house.furniture.some((f) => f.type === type);
  const floorArea = house.floors.reduce((a, f) => a + Math.abs(f.x1 - f.x0) * Math.abs(f.z1 - f.z0) * GRID * GRID, 0);
  const windows = house.openings.filter((o) => o.kind === 'window').length;
  const entrance = house.openings.some((o) => o.type.startsWith('entrance'));
  const topLevel = house.floors.reduce((m, f) => Math.max(m, f.level), 0);
  const topArea = house.floors
    .filter((f) => f.level === topLevel)
    .reduce((a, f) => a + Math.abs(f.x1 - f.x0) * Math.abs(f.z1 - f.z0), 0);
  const roofArea = house.roofs
    .filter((r) => r.level === topLevel)
    .reduce((a, r) => a + Math.abs(r.x1 - r.x0) * Math.abs(r.z1 - r.z0), 0);
  const roofed = topArea > 0 && roofArea >= topArea * 0.9;
  const needsStair = topLevel > 0;
  const exteriorMaterials = new Set(house.walls.map((w) => w.exterior.material));
  const decor = house.furniture.filter((f) => ['plant', 'rug', 'shelf', 'sofa', 'tv'].includes(f.type)).length;

  const items: QualityItem[] = [
    { label: '玄関ドアがある', ok: entrance, value: 0.05 },
    { label: 'キッチンがある', ok: has('kitchen'), value: 0.1 },
    { label: 'お風呂がある', ok: has('bath'), value: 0.1 },
    { label: 'トイレがある', ok: has('toilet'), value: 0.08 },
    { label: 'ベッドがある', ok: has('bed-double') || has('bed-single'), value: 0.05 },
    { label: '窓が十分ある（床15m²に1つ以上）', ok: floorArea > 0 && windows >= floorArea / 15, value: 0.07 },
    { label: '家具・インテリアが充実（4つ以上）', ok: decor >= 4, value: 0.05 },
    { label: '外壁の素材が2種類以内（統一感）', ok: house.walls.length > 0 && exteriorMaterials.size <= 2, value: 0.05 },
    { label: '屋根がかかっている', ok: roofed, value: -0.3 },
  ];
  if (needsStair) items.push({ label: '2階へ上がる階段がある', ok: house.stairs.length > 0, value: -0.3 });

  let factor = 0.75;
  for (const it of items) {
    if (it.value > 0 && it.ok) factor += it.value;
    if (it.value < 0 && !it.ok) factor += it.value;
  }
  return { factor: Math.round(Math.max(0.2, factor) * 100) / 100, items };
}

/** 建物の査定額（相場をかける前）= 建築費 × 品質係数 × 立地 */
export function appraiseBuilding(house: House, locationFactor: number): number {
  const cost = estimateCost(house).total;
  return Math.round(cost * quality(house).factor * locationFactor);
}
