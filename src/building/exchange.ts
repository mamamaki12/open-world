import { TUNER } from './tuner';
/** 証券取引所。カスタムショップの西隣（間に2m）。正面は町の南の道路に面する。civic site 基準。 */
const GAP = 2, WIDTH = 11, DEPTH = 12;
export const EXCHANGE = { x0: TUNER.x0 - GAP - WIDTH, x1: TUNER.x0 - GAP, z0: TUNER.z0, z1: TUNER.z0 + DEPTH, height: 7 };
