// パーツと素材のカタログ。データ（JSON）を足すだけで種類を増やせる。
import materialsData from './materials.json';
import openingsData from './openings.json';
import furnitureData from './furniture.json';
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

export type Paint = 'main' | 'wood' | 'white' | 'black' | 'dark' | 'accent' | 'counter' | 'steel';

export interface FurniturePiece {
  shape: 'box' | 'cylinder' | 'sphere';
  size: [number, number, number];
  pos: [number, number, number];
  paint: Paint;
}

export interface FurnitureDef {
  id: string;
  name: string;
  colors: string[];
  parts: FurniturePiece[];
}

export const MATERIAL_CATEGORY_NAMES = materialsData.categories as Record<MaterialCategory, string>;
export const MATERIALS = materialsData.materials as MaterialDef[];
export const OPENINGS = openingsData.types as OpeningDef[];
export const SASH_COLORS = openingsData.sashColors as NamedColor[];
export const PANEL_COLORS = openingsData.panelColors as NamedColor[];
export const SASH_TYPES = openingsData.sashTypes as SashTypeDef[];
export const FURNITURE = furnitureData.types as FurnitureDef[];

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

export function getFurniture(id: string): FurnitureDef {
  return furnitureById.get(id) ?? FURNITURE[0];
}

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
