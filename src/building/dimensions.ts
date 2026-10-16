// 寸法の基準（m）

/** 1マス = 910mm（尺モジュール） */
export const GRID = 0.91;
/** 土地の広さ（マス） */
export const LOT_W = 24;
export const LOT_D = 20;
/** 1階の床の高さ（基礎の高さ） */
export const BASE_HEIGHT = 0.5;
/** 階高（床から上の階の床まで） */
export const STORY_HEIGHT = 2.9;
/** 壁の高さ（その階の床から） */
export const WALL_HEIGHT = STORY_HEIGHT;
export const WALL_THICKNESS = 0.15;
/** 2階の床スラブの厚み */
export const SLAB_THICKNESS = 0.25;
export const MAX_LEVEL = 9; // 10階建てまで（0 = 1階, 9 = 10階）

/** 階段：幅1マス × 長さ4マス、14段 */
export const STAIR_LENGTH = 4;
export const STAIR_RISERS = 14;
/** 階段の踏み板の幅と、段鼻から手すりまでの高さ */
export const STAIR_WIDTH = GRID - 0.12;
export const STAIR_RAIL_HEIGHT = 0.8;

export function floorY(level: number): number {
  return BASE_HEIGHT + level * STORY_HEIGHT;
}

export function wallTopY(level: number): number {
  return floorY(level) + WALL_HEIGHT;
}

export function levelName(level: number): string {
  return `${level + 1}階`;
}
