// 家のデータ。描画やUIから独立した「ゲームのルール側」の型。
// 座標は2種類：
//  - グリッド座標（整数）：1マス = 910mm。壁・床・屋根・階段はこれで置く
//  - メートル座標：家具の位置、窓・ドアの壁上の位置
import type { FurnitureDef } from '../catalog';

/** 素材＋色の組み合わせ。素材IDは catalog/materials.json を参照 */
export interface Finish {
  material: string;
  color: string; // #rrggbb
}

/** 床（四角形）。x0..x1, z0..z1 はグリッド点 */
export interface FloorPart {
  id: string;
  level: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  finish: Finish;
  /** terrace：屋外のテラス（ウッドデッキなど）。省略は部屋の床 */
  kind?: FloorKind;
}

export type FloorKind = 'room' | 'terrace';

/** 壁。グリッド線に沿った直線（x方向かz方向） */
export interface WallPart {
  id: string;
  level: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  exterior: Finish;
  interior: Finish;
  /** 壁の高さ。half は腰壁（階高の半分）。省略は full */
  height?: WallHeight;
}

export type WallHeight = 'full' | 'half' | 'fence' | 'privacyFence';

export type OpeningKind = 'door' | 'window';

/** 窓・ドア。壁に開ける穴とその建具 */
export interface OpeningPart {
  id: string;
  wallId: string;
  kind: OpeningKind;
  type: string; // catalog/openings.json の id
  /** 壁の始点から開口の中心までの距離（m） */
  offset: number;
  sashColor: string;
  panelColor: string;
  /** サッシの種類（catalog/openings.json の sashTypes）。無ければアルミ */
  sash?: string;
}

/** 階段（直階段）。幅1マス × 長さ4マス。level から level+1 へ上がる */
export interface StairPart {
  id: string;
  level: number;
  x: number; // 足元側のマス
  z: number;
  /** 0: +z方向へ上る, 1: +x, 2: -z, 3: -x */
  rot: 0 | 1 | 2 | 3;
  shape?: StairShape;
  finish: Finish;
  /** 手すりの付き方（上る向きに見て）。省略は左 */
  rail?: StairRail;
}

export type StairRail = 'left' | 'right' | 'both' | 'none';
export type StairShape = 'straight' | 'compact' | 'l' | 'u';

export type RoofType = 'gable' | 'hip' | 'shed' | 'flat';

/** 屋根。四角形の範囲（グリッド点）に、その階の壁の上へ載る */
export interface RoofPart {
  id: string;
  level: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  type: RoofType;
  /** 棟の向き */
  axis: 'x' | 'z';
  /** 片流れの高い側を反対にする */
  flip: boolean;
  /** 勾配（寸）。4寸 = 10進んで4上がる */
  pitch: number;
  /** 軒の出（m） */
  overhang: number;
  finish: Finish;
  /** 妻壁（屋根の三角部分の壁）の仕上げ */
  gableFinish: Finish;
}

/** 家具。位置は自由（m）、向きは度 */
export interface FurniturePart {
  id: string;
  level: number;
  type: string; // catalog/furniture.json の id、またはデザインした家具の design:…
  /** デザインした家具の形（type と同じ id）。セーブ・共有でもそのまま伝わる */
  design?: FurnitureDef;
  x: number;
  z: number;
  rotation: number;
  color: string;
  /** 表札の文字 */
  label?: string;
  /** 壁付け表札の取付先。壁の移動にも追従する。heightは壁の足元から文字中心までの高さ。 */
  wallMount?: { wallId: string; offset: number; height: number; side: 1 | -1 };
}

export interface House {
  version: 1;
  floors: FloorPart[];
  walls: WallPart[];
  openings: OpeningPart[];
  stairs: StairPart[];
  roofs: RoofPart[];
  furniture: FurniturePart[];
}

export type PartKind = 'floor' | 'wall' | 'opening' | 'stair' | 'roof' | 'furniture';

export interface PartRef {
  kind: PartKind;
  id: string;
}

export function emptyHouse(): House {
  return { version: 1, floors: [], walls: [], openings: [], stairs: [], roofs: [], furniture: [] };
}

