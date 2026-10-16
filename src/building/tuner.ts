import { DEALER } from './dealer';
/** 車のカスタムショップ。カーディーラーの西隣（間に2m）。正面は町の南の道路に面する。全てcivic site基準。 */
const GAP = 2, WIDTH = 16, DEPTH = 12;
export const TUNER = { x0: DEALER.x0 - GAP - WIDTH, x1: DEALER.x0 - GAP, z0: DEALER.z0, z1: DEALER.z0 + DEPTH, height: 5.4 };
/** 外から歩いても車でも通り抜けられない店の建物（入口の扉は venues 側で扱う） */
export const SHOP_BOXES = [DEALER, TUNER];
