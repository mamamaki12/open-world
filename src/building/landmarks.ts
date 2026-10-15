// ワールドに最初からある施設（プレイヤーの家とは別。消したり上に建てたりできない）
// いまはカジノ・競技場だけ。土地の前の道路をはさんだ向かい側に建っている
import { GRID, LOT_D, LOT_W } from './dimensions';
import { PLAYER } from './walk';
import type { Vec2 } from './walk';
import { PLOT_PITCH } from '../economy/town';

export interface Box {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

const lotW = LOT_W * GRID;
const lotD = LOT_D * GRID;

/** カジノの建物。正面（入口）は道路側（-Z）を向く */
export const CASINO = {
  x0: lotW / 2 - 12,
  x1: lotW / 2 + 12,
  z0: lotD + 9,
  z1: lotD + 23,
  height: 9,
  /** 入口（正面の真ん中） */
  door: { x: lotW / 2, width: 4.2, height: 3.4 },
  /** 入口のひさし（柱2本で支える） */
  canopyDepth: 3.6,
};

/** 入口前の広場（道路から入口まで） */
export const CASINO_PLAZA: Box = { x0: CASINO.x0 - 2, x1: CASINO.x1 + 2, z0: lotD + 6.2, z1: CASINO.z0 };

const PILLAR = 0.25;
/** カジノの東隣の不動産屋。入口は道路側（-Z）。 */
export const ESTATE = {
  x0: lotW / 2 + PLOT_PITCH - 5,
  x1: lotW / 2 + PLOT_PITCH + 5,
  z0: lotD + 9,
  z1: lotD + 17,
  height: 4.5,
  door: { x: lotW / 2 + PLOT_PITCH, width: 2.2 },
};
/** ひさしの柱の位置 */
export const CASINO_PILLARS: Vec2[] = [-1, 1].map((s) => ({
  x: CASINO.door.x + s * (CASINO.door.width / 2 + 1.2),
  z: CASINO.z0 - CASINO.canopyDepth + 0.4,
}));

/** 入口の左右の植え込み */
export const CASINO_PLANTERS: Box[] = [-1, 1].map((s) => {
  const x = CASINO.door.x + s * 6.5;
  return { x0: x - 1.3, x1: x + 1.3, z0: CASINO.z0 - 1.8, z1: CASINO.z0 - 0.6 };
});

/** 歩くときにぶつかるもの */
export const LANDMARK_COLLIDERS: Box[] = [
  { x0: ESTATE.x0, x1: ESTATE.x1, z0: ESTATE.z0, z1: ESTATE.z1 },
  { x0: CASINO.x0, x1: CASINO.x1, z0: CASINO.z0, z1: CASINO.z1 },
  ...CASINO_PLANTERS,
  ...CASINO_PILLARS.map((p) => ({ x0: p.x - PILLAR, x1: p.x + PILLAR, z0: p.z - PILLAR, z1: p.z + PILLAR })),
];

/** 施設にめり込んだら、いちばん近い辺の外へ押し戻す */
export function resolveLandmarks(p: Vec2, radius = PLAYER.radius): Vec2 {
  let { x, z } = p;
  for (const b of LANDMARK_COLLIDERS) {
    const x0 = b.x0 - radius;
    const x1 = b.x1 + radius;
    const z0 = b.z0 - radius;
    const z1 = b.z1 + radius;
    if (x <= x0 || x >= x1 || z <= z0 || z >= z1) continue;
    const out = [
      { d: x - x0, x: x0, z },
      { d: x1 - x, x: x1, z },
      { d: z - z0, x, z: z0 },
      { d: z1 - z, x, z: z1 },
    ].reduce((a, b2) => (b2.d < a.d ? b2 : a));
    x = out.x;
    z = out.z;
  }
  return { x, z };
}

/** カジノの入口の前に立っているか（ここで「入る」ができる） */
export function atCasinoDoor(x: number, z: number, y = 0): boolean {
  return Math.abs(y) < 0.6 && Math.abs(x - CASINO.door.x) < CASINO.door.width / 2 + 0.6 && z > CASINO.z0 - 2.4 && z <= CASINO.z0 + 0.01;
}

export function atEstateDoor(x: number, z: number, y = 0): boolean {
  return Math.abs(y) < 0.6 && Math.abs(x - ESTATE.door.x) < ESTATE.door.width / 2 + 0.6 && z > ESTATE.z0 - 2.4 && z <= ESTATE.z0 + 0.01;
}

/** 「カジノへ行く」で立つ場所：入口の少し手前で、入口を向く */
export const CASINO_ARRIVAL = { x: CASINO.door.x, z: CASINO.z0 - 1.6, yaw: Math.PI };

