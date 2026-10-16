// 町の家を組み立てるための道具。プレイヤーが建築モードで置くのと同じ部品（壁・床・窓・ドア・階段・屋根・家具）だけを使う。
// 位置はグリッド（1マス = 910mm）で書く。家具もマス単位で書いて、メートルに直す
import { getFurniture, getOpening } from '../catalog';
import { GRID, LOT_W, LOT_D } from './dimensions';
import { snapOpeningOffset, wallLength, stairHoles, wallsOverlap } from './rules';
import { stairPlan, stairWorldGrid } from './stairs';
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
    this.house.stairs.push({ id: this.id('stair'), level, x, z, rot, finish, rail: 'both', ...(shape ? { shape } : {}) });
  }

  /** 完成時に、上階の床端と階段穴の側面を腰壁で保護する。 */
  finish(): House {
    const guard = fin('metal-v', '#6f7377');
    const add = (level: number, x0: number, z0: number, x1: number, z1: number, height: WallHeight) => {
      const edge = { x0, z0, x1, z1 };
      if (!this.house.walls.some(w => w.level === level && wallsOverlap(w, edge))) {
        this.wall(level, x0, z0, x1, z1, guard, guard, height);
      }
    };
    // 外構は地面から立てる。道路側は玄関と車庫のために広く開ける。
    for (let x = 0; x < LOT_W; x++) {
      add(0, x, 0, x + 1, 0, 'fence');
      if (x < 8) add(0, x, LOT_D, x + 1, LOT_D, 'fence');
    }
    for (let z = 0; z < LOT_D; z++) {
      add(0, 0, z, 0, z + 1, 'fence');
      add(0, LOT_W, z, LOT_W, z + 1, 'fence');
    }
    for (const level of new Set(this.house.floors.map(f => f.level))) {
      if (level === 0) continue;
      const holes = stairHoles(this.house, level);
      const covered = (x: number, z: number) => this.house.floors.some(f => f.level === level &&
        x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) &&
        !holes.some(h => x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1);
      // 階段の上端だけは通れるままにする。側面・下端は床から落ちないよう囲む。
      const exits = this.house.stairs.filter(s => s.level === level - 1).map(s => {
        const flights = stairPlan(s.shape).flights;
        const f = flights[flights.length - 1];
        const [dx, dz] = [[0, 1], [1, 0], [0, -1], [-1, 0]][f.dir];
        const p = stairWorldGrid(s, f.x + dx * f.length, f.z + dz * f.length);
        return { p, alongX: (f.dir + s.rot) % 2 === 1 };
      });
      for (const s of this.house.stairs.filter(s => s.level === level)) {
        const f = stairPlan(s.shape).flights[0];
        exits.push({ p: stairWorldGrid(s, f.x, f.z), alongX: (f.dir + s.rot) % 2 === 1 });
      }
      const entrance = (x0: number, z0: number, x1: number, z1: number) =>
        exits.some(e => e.alongX === (x0 === x1) &&
          Math.abs(e.p.x - (x0 + x1) / 2) < 0.01 && Math.abs(e.p.z - (z0 + z1) / 2) < 0.01);
      for (let z = 0; z < LOT_D; z++) for (let x = 0; x < LOT_W; x++) {
        if (!covered(x + 0.5, z + 0.5)) continue;
        const edges = [
          [x, z, x + 1, z, x + 0.5, z - 0.5],
          [x, z + 1, x + 1, z + 1, x + 0.5, z + 1.5],
          [x, z, x, z + 1, x - 0.5, z + 0.5],
          [x + 1, z, x + 1, z + 1, x + 1.5, z + 0.5],
        ];
        for (const [ax, az, bx, bz, nx, nz] of edges) {
          if (!covered(nx, nz) && !entrance(ax, az, bx, bz)) add(level, ax, az, bx, bz, 'half');
        }
      }
    }
    return this.house;
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
