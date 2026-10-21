// パーツと素材のカタログ。データ（JSON）を足すだけで種類を増やせる。
import materialsData from './materials.json';
import openingsData from './openings.json';
import furnitureData from './furniture.json';
import { LIGHTING } from './lighting';
import type { OpeningKind } from '../building/types';

export type MaterialCategory = 'exterior' | 'interior' | 'roof' | 'floor' | 'wood';

export type Pattern =
  | 'siding'
  | 'brick'
  | 'stucco'
  | 'boardV'
  | 'rib'
  | 'fabric'
  | 'kawara'
  | 'slate'
  | 'seam'
  | 'planks'
  | 'tatami'
  | 'tile'
  | 'grain'
  | 'sidingV'
  | 'stone'
  | 'concrete'
  | 'clapboard'
  | 'herringbone'
  | 'wideplank'
  | 'marble'
  | 'mosaic'
  | 'border'
  | 'shingle'
  | 'spanish'
  | 'flatTile'
  | 'bigTile'
  | 'ryukyu'
  | 'alc'
  | 'solar'
  | 'turf';

export interface MaterialDef {
  id: string;
  name: string;
  category: MaterialCategory;
  pattern: Pattern;
  roughness: number;
  metalness: number;
  bump: number;
  colors: string[];
  /** 選ぶときに出す一言 */
  note?: string;
}

export interface SashTypeDef {
  id: string;
  name: string;
  note: string;
  /** 窓・ドアの値段にかける倍率 */
  priceRate: number;
  roughness: number;
  metalness: number;
  /** 木目などの模様を出すときの素材ID（色はサッシの色を使う） */
  material?: string;
}

export type OpeningStyle =
  | 'entrance'
  | 'entranceDouble'
  | 'swing'
  | 'sliding'
  | 'slidingWindow'
  | 'casement'
  | 'fix';

export interface OpeningDef {
  id: string;
  kind: OpeningKind;
  name: string;
  width: number;
  height: number;
  sill: number;
  style: OpeningStyle;
}

export interface NamedColor {
  name: string;
  hex: string;
}

export type Paint =
  | 'main' | 'wood' | 'white' | 'black' | 'dark' | 'accent' | 'counter' | 'steel'
  | 'water' | 'green' | 'soil' | 'stone' | 'terracotta';

export interface FurniturePiece {
  shape: 'box' | 'cylinder' | 'sphere';
  size: [number, number, number];
  pos: [number, number, number];
  paint: Paint;
  /** 発光するシェード・拡散板。実際の周辺光は FurnitureLighting の共有枠で描く。 */
  glow?: boolean;
  /** 動く部品：引き出しは手前（+Z）へ引き出す。扉は左右どちらかの縦の辺を軸に開く */
  move?: 'drawer' | 'door-l' | 'door-r';
}

export interface FurnitureDef {
  id: string;
  name: string;
  /** outdoor：庭・外構に置くもの（プール・花など）。省略は家の中の家具 */
  category?: 'outdoor' | 'lighting';
  /** 取付中心はモデル内の y=1.6m。back は取付中心から背面までの距離。 */
  mount?: { width: number; height: number; back: number };
  /** 原点を天井下面に置き、部品は下向きに配置する。 */
  ceiling?: boolean;
  light?: { position: [number, number, number]; color: string; intensity: number; distance: number };
  /** 外構・ガレージ部材は地面基準。部品ごとの衝突判定で車庫の内部を通れる。 */
  grounded?: boolean;
  collisionParts?: boolean;
  /** 文字を書く面（表札）。pos は面の中心、size は幅・高さ（m）。+Z 向き */
  label?: { pos: [number, number, number]; size: [number, number] };
  colors: string[];
  parts: FurniturePiece[];
  /** 座れる家具：座面の高さ（m）と、座る位置の前後のずれ（+Z が前） */
  seat?: { height: number; z: number };
}

export const MATERIAL_CATEGORY_NAMES = materialsData.categories as Record<MaterialCategory, string>;
export const MATERIALS = materialsData.materials as MaterialDef[];
export const OPENINGS = openingsData.types as OpeningDef[];
export const SASH_COLORS = openingsData.sashColors as NamedColor[];
export const PANEL_COLORS = openingsData.panelColors as NamedColor[];
export const SASH_TYPES = openingsData.sashTypes as SashTypeDef[];
export const FURNITURE: FurnitureDef[] = [
  ...(furnitureData.types as FurnitureDef[]).map(f => f.id === 'nameplate' ? { ...f, mount: { width: .34, height: .13, back: .0125 } } :
    f.id === 'floor-lamp' ? { ...f, category: 'lighting' as const,
      light: { position: [0, 1.55, 0] as [number, number, number], color: '#ffd6a0', intensity: 3, distance: 5 },
      parts: f.parts.map((p, i) => i === 2 ? { ...p, glow: true } : p) } : f),
  ...LIGHTING,
];

const materialById = new Map(MATERIALS.map((m) => [m.id, m]));
const openingById = new Map(OPENINGS.map((o) => [o.id, o]));
const furnitureById = new Map(FURNITURE.map((f) => [f.id, f]));

/** サッシの種類（古いセーブには無いのでアルミとして扱う） */
export function getSashType(id: string | undefined): SashTypeDef {
  return SASH_TYPES.find((t) => t.id === id) ?? SASH_TYPES[0];
}

export function getMaterial(id: string): MaterialDef {
  return materialById.get(id) ?? MATERIALS[0];
}

export function materialsIn(category: MaterialCategory): MaterialDef[] {
  return MATERIALS.filter((m) => m.category === category);
}

export function getOpening(id: string): OpeningDef {
  const def = openingById.get(id);
  if (!def) throw new Error(`unknown opening type: ${id}`);
  return def;
}

export function hasOpening(id: string): boolean {
  return openingById.has(id);
}

export function openingsOf(kind: OpeningKind): OpeningDef[] {
  return OPENINGS.filter((o) => o.kind === kind);
}

/** プレイヤーがデザインした家具（id は design:…）。自分のライブラリと、置いた家具に入っていたもの */
const designById = new Map<string, FurnitureDef>();
export function registerDesign(def: FurnitureDef) {
  designById.set(def.id, def);
}

export function getFurniture(id: string): FurnitureDef {
  return furnitureById.get(id) ?? designById.get(id) ?? FURNITURE[0];
}

/** 置いた家具の形。デザインした家具は家具そのものに入っている形を使う（ほかの人の家でも見える） */
export function furnitureDef(item: { type?: string; design?: FurnitureDef }): FurnitureDef {
  if (item.design && item.design.id === item.type) {
    if (!designById.has(item.type)) registerDesign(item.design);
    return item.design;
  }
  return getFurniture(item.type ?? '');
}

/** 動く部品（引き出し・扉）があるか */
export const hasMovingParts = (def: FurnitureDef) => def.parts.some((p) => p.move);

/** 家具の床面での大きさ（回転前、m）。部品の外形から求める */
export function furnitureFootprint(def: FurnitureDef): { w: number; d: number } {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of def.parts) {
    minX = Math.min(minX, p.pos[0] - p.size[0] / 2);
    maxX = Math.max(maxX, p.pos[0] + p.size[0] / 2);
    minZ = Math.min(minZ, p.pos[2] - p.size[2] / 2);
    maxZ = Math.max(maxZ, p.pos[2] + p.size[2] / 2);
  }
  return { w: maxX - minX, d: maxZ - minZ };
}

/** 家具の外形（回転前のローカル座標、m） */
export function furnitureBounds(def: FurnitureDef): { minX: number; maxX: number; minZ: number; maxZ: number; top: number } {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, top = 0;
  for (const p of def.parts) {
    minX = Math.min(minX, p.pos[0] - p.size[0] / 2);
    maxX = Math.max(maxX, p.pos[0] + p.size[0] / 2);
    minZ = Math.min(minZ, p.pos[2] - p.size[2] / 2);
    maxZ = Math.max(maxZ, p.pos[2] + p.size[2] / 2);
    top = Math.max(top, p.pos[1] + p.size[1] / 2);
  }
  return { minX, maxX, minZ, maxZ, top };
}
