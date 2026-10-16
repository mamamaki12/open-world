// 町の家を組み立てるための道具。プレイヤーが建築モードで置くのと同じ部品（壁・床・窓・ドア・階段・屋根・家具）だけを使う。
// 位置はグリッド（1マス = 910mm）で書く。家具もマス単位で書いて、メートルに直す
import { getFurniture, getOpening } from '../catalog';
import { GRID } from './dimensions';
import { snapOpeningOffset, wallLength } from './rules';
import { emptyHouse } from './types';
import type { Finish, FloorKind, House, OpeningPart, RoofPart, StairPart, StairShape, WallHeight, WallPart } from './types';

export const fin = (material: string, color: string): Finish => ({ material, color });

export interface Box {
  /** 奥（z0） */
  n: WallPart;
  /** 手前・道路側（z1） */
  s: WallPart;
  /** 西（x0） */
  w: WallPart;
  /** 東（x1） */
  e: WallPart;
}

export interface OpeningStyle {
  sashColor?: string;
  panelColor?: string;
  sash?: string;
}

export class HouseKit {
  readonly house: House = emptyHouse();
  private count = 0;
  /** 窓・ドアのいつもの色 */
  style: Required<Pick<OpeningStyle, 'sashColor' | 'panelColor'>> & { sash?: string } = { sashColor: '#3a3c3f', panelColor: '#5a3e2b' };

  constructor(private readonly key: string) {}

  private id(kind: string) {
    this.count += 1;
    return `town-${this.key}-${kind}-${this.count}`;
  }

  floor(level: number, x0: number, z0: number, x1: number, z1: number, finish: Finish, kind?: FloorKind) {
    this.house.floors.push({ id: this.id('floor'), level, x0, z0, x1, z1, finish, ...(kind ? { kind } : {}) });
  }

  wall(level: number, x0: number, z0: number, x1: number, z1: number, exterior: Finish, interior: Finish = exterior, height?: WallHeight): WallPart {
    const w: WallPart = { id: this.id('wall'), level, x0, z0, x1, z1, exterior, interior, ...(height ? { height } : {}) };
    this.house.walls.push(w);
    return w;
  }

  /** 四角い部屋の外周の壁4枚（床も張る） */
  box(level: number, x0: number, z0: number, x1: number, z1: number, exterior: Finish, interior: Finish, floor?: Finish): Box {
    if (floor) this.floor(level, x0, z0, x1, z1, floor);
    return {
      n: this.wall(level, x0, z0, x1, z0, exterior, interior),
      s: this.wall(level, x0, z1, x1, z1, exterior, interior),
      w: this.wall(level, x0, z0, x0, z1, exterior, interior),
      e: this.wall(level, x1, z0, x1, z1, exterior, interior),
    };
  }

  /** 窓・ドアを付ける。at は壁の始点（x0・z0 の側）からの中心の位置（マス、半マス刻み） */
  open(wall: WallPart, type: string, at: number, style: OpeningStyle = {}) {
    const def = getOpening(type);
    const offset = snapOpeningOffset(wallLength(wall), at * GRID, def.width);
    const o: OpeningPart = {
      id: this.id('opening'), wallId: wall.id, kind: def.kind, type, offset,
      sashColor: style.sashColor ?? this.style.sashColor,
      panelColor: style.panelColor ?? this.style.panelColor,
    };
    const sash = style.sash ?? this.style.sash;
    if (sash) o.sash = sash;
    this.house.openings.push(o);
  }

  /** 同じ窓を何か所かに付ける */
  windows(wall: WallPart, type: string, ats: number[], style?: OpeningStyle) {
    for (const at of ats) this.open(wall, type, at, style);
  }

  stair(level: number, x: number, z: number, rot: StairPart['rot'], finish: Finish, shape?: StairShape) {
    this.house.stairs.push({ id: this.id('stair'), level, x, z, rot, finish, ...(shape ? { shape } : {}) });
  }

  roof(level: number, x0: number, z0: number, x1: number, z1: number, type: RoofPart['type'], finish: Finish, gableFinish: Finish,
    opts: { axis?: 'x' | 'z'; flip?: boolean; pitch?: number; overhang?: number } = {}) {
    this.house.roofs.push({
      id: this.id('roof'), level, x0, z0, x1, z1, type, finish, gableFinish,
      axis: opts.axis ?? 'x', flip: opts.flip ?? false, pitch: opts.pitch ?? 4, overhang: opts.overhang ?? 0.6,
    });
  }

  /** 家具。gx・gz はマス単位の中心の位置。rot は度（0 で +Z（道路側）を向く） */
  item(level: number, type: string, gx: number, gz: number, rot = 0, color?: string, label?: string) {
    const def = getFurniture(type);
    this.house.furniture.push({
      id: this.id('furniture'), level, type, x: round(gx * GRID), z: round(gz * GRID), rotation: rot,
      color: color ?? def.colors[0], ...(label ? { label } : {}),
    });
  }
}

const round = (v: number) => Math.round(v * 1000) / 1000;
