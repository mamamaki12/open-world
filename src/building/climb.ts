// 窓を乗り越える動きの段取り（描画に依存しない計算）
// 1. 窓の前に立つ → 2. 窓台に手をかけてよじ登り、枠の上でしゃがむ →
// 3. 低ければ反対側へ降りる / 2階など高ければ外へ飛び降りる（そこからは重力で落ちる）
import { PLAYER, surfaceHeight } from './walk';
import type { WindowPassage } from './walk';
import type { House } from './types';

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface ClimbPlan {
  passage: WindowPassage;
  /** 体の向き（体の正面は -Z、yaw で回す） */
  yaw: number;
  start: Point3;
  /** よじ登る前に立つ位置（窓の手前） */
  stand: Point3;
  /** 窓枠の上でしゃがむ位置 */
  perch: Point3;
  /** 降りる先 */
  dest: Point3;
  /** 枠から降りる先までの高さ（m） */
  drop: number;
  /** 高すぎて降りられず、飛び降りる */
  leap: boolean;
}

/** 飛び降りになる高さ（これより低ければ足から降りる） */
export const LEAP_DROP = 2.0;

/** それぞれの段階の長さ（秒） */
export const CLIMB_TIME = {
  approach: 0.35,
  climb: 1.05,
  perch: 0.15,
  perchHigh: 0.75,
  hop: 0.5,
};

/** 飛び出す速さ（m/s）：外へ・上へ */
export const LEAP_VELOCITY = { out: 2.1, up: 2.3 };

export function planClimb(house: House, passage: WindowPassage, start: Point3): ClimbPlan {
  const { nx, nz } = passage;
  const yaw = Math.atan2(-nx, -nz);
  const standOff = PLAYER.radius + 0.2;
  const stand = { x: passage.x - nx * standOff, y: start.y, z: passage.z - nz * standOff };
  const perch = { x: passage.x, y: passage.sillY, z: passage.z };
  const out = PLAYER.radius + 0.4;
  const dx = passage.x + nx * out;
  const dz = passage.z + nz * out;
  const dy = surfaceHeight(house, dx, dz, passage.sillY);
  const drop = passage.sillY - dy;
  return { passage, yaw, start, stand, perch, dest: { x: dx, y: dy, z: dz }, drop, leap: drop > LEAP_DROP };
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const ease = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type ClimbPhase = 'approach' | 'climb' | 'perch' | 'hop' | 'leap';

/** その時点の体の位置としぐさ */
export interface ClimbFrame {
  phase: ClimbPhase;
  pos: Point3;
  /** 0..1：しゃがみ・片ひざ上げ・枠の上で小さくなる */
  crouch: number;
  tuck: number;
  perch: number;
  /** 手を窓台に置く（'sill'）か、両脇の枠をつかむ（'jamb'）か */
  hands: 'sill' | 'jamb' | null;
  /** 空中（降りている） */
  air: boolean;
  /** 下を見る（飛び降りる前） */
  lookDown: number;
}

/** 動きの全体の長さ（飛び降りる場合は飛び出すまで） */
export function climbDuration(plan: ClimbPlan): number {
  return CLIMB_TIME.approach + CLIMB_TIME.climb + (plan.leap ? CLIMB_TIME.perchHigh : CLIMB_TIME.perch) + (plan.leap ? 0 : CLIMB_TIME.hop);
}

/** 経過時間 t 秒の体の位置としぐさ。飛び降りでは最後に phase 'leap' を返す */
export function climbFrame(plan: ClimbPlan, t: number): ClimbFrame {
  const { start, stand, perch, dest, passage } = plan;
  let rest = t;
  if (rest < CLIMB_TIME.approach) {
    const e = ease(rest / CLIMB_TIME.approach);
    return {
      phase: 'approach',
      pos: { x: lerp(start.x, stand.x, e), y: start.y, z: lerp(start.z, stand.z, e) },
      crouch: 0.3 * e,
      tuck: 0,
      perch: 0,
      hands: e > 0.6 ? 'sill' : null,
      air: false,
      lookDown: 0.2 * e,
    };
  }
  rest -= CLIMB_TIME.approach;
  if (rest < CLIMB_TIME.climb) {
    const u = rest / CLIMB_TIME.climb;
    // 少し沈んでから体を引き上げ、遅れて前へ乗り出す
    const up = ease((u - 0.12) / 0.7);
    const fwd = ease((u - 0.35) / 0.65);
    const y = lerp(stand.y, perch.y, up) + Math.sin(Math.PI * up) * 0.1 - (u < 0.12 ? Math.sin((u / 0.12) * Math.PI) * 0.04 : 0);
    return {
      phase: 'climb',
      pos: { x: lerp(stand.x, perch.x, fwd), y, z: lerp(stand.z, perch.z, fwd) },
      crouch: lerp(0.3, 1, ease(u / 0.6)),
      tuck: u < 0.65 ? ease((u - 0.2) / 0.3) : 1 - ease((u - 0.65) / 0.35),
      perch: ease((u - 0.6) / 0.4),
      hands: u < 0.85 ? 'sill' : 'jamb',
      air: false,
      lookDown: 0.2,
    };
  }
  rest -= CLIMB_TIME.climb;
  const perchTime = plan.leap ? CLIMB_TIME.perchHigh : CLIMB_TIME.perch;
  if (rest < perchTime) {
    const u = rest / perchTime;
    // 飛び降りる前は外側の縁へにじり出て、下をのぞく
    const edge = plan.leap ? ease((u - 0.3) / 0.7) * 0.1 : 0;
    return {
      phase: 'perch',
      pos: { x: perch.x + passage.nx * edge, y: perch.y, z: perch.z + passage.nz * edge },
      crouch: 1,
      tuck: 0,
      perch: plan.leap ? 1 - 0.25 * ease((u - 0.75) / 0.25) : 1,
      hands: 'jamb',
      air: false,
      lookDown: plan.leap ? 0.6 * Math.sin(Math.PI * Math.min(u * 1.3, 1)) : 0.3,
    };
  }
  rest -= perchTime;
  if (plan.leap) {
    return {
      phase: 'leap',
      pos: { x: perch.x + passage.nx * 0.1, y: perch.y, z: perch.z + passage.nz * 0.1 },
      crouch: 0.6,
      tuck: 0,
      perch: 0,
      hands: null,
      air: true,
      lookDown: 0.3,
    };
  }
  // 足から反対側へ降りる
  const u = clamp01(rest / CLIMB_TIME.hop);
  const e = ease(u);
  return {
    phase: 'hop',
    pos: {
      x: lerp(perch.x, dest.x, e),
      y: lerp(perch.y, dest.y, u * u) + Math.sin(Math.PI * u) * 0.15,
      z: lerp(perch.z, dest.z, e),
    },
    crouch: lerp(1, 0.2, u),
    tuck: 0,
    perch: 1 - e,
    hands: u < 0.3 ? 'jamb' : null,
    air: u > 0.15 && u < 0.95,
    lookDown: 0.2,
  };
}
