import { CASINO } from './landmarks';
/** カジノの西隣（間に駐車場）。正面は町の南の道路に面する。全てcivic site基準。
 *  以前は不動産屋の東隣で、町の東端の道路の突き当たりと町の外にはみ出していた。 */
const LOT_WIDTH = 17, GAP = 1.5, WIDTH = 18;
const X1 = CASINO.x0 - 3 - LOT_WIDTH - GAP;
export const DEALER = { x0: X1-WIDTH, x1: X1, z0: CASINO.z0, z1: CASINO.z0+12, height:5.2 };
export function atDealerDoor(x:number,z:number,y=0) {
  return Math.abs(y)<.5 && Math.abs(x-(DEALER.x0+DEALER.x1)/2)<2.4 && z>DEALER.z0-2.7 && z<=DEALER.z0+.05;
}

/** 納車・お客様駐車場。店とカジノのあいだにあり、正面の道路から見える。中央の通路をはさんで左右5台ずつ、鼻先を通路へ向けて止める。 */
export const DEALER_LOT = { x0: DEALER.x1 + GAP, x1: DEALER.x1 + GAP + LOT_WIDTH, z0: DEALER.z0 - .5, z1: DEALER.z0 + 16 };
const BAY_DEPTH = 5.5, BAY_WIDTH = 3.1;
export const DEALER_BAYS = Array.from({ length: 10 }, (_, i) => {
  const left = i < 5, row = i % 5;
  return { x: left ? DEALER_LOT.x0 + BAY_DEPTH / 2 : DEALER_LOT.x1 - BAY_DEPTH / 2, z: DEALER_LOT.z0 + .5 + BAY_WIDTH * (row + .5), yaw: left ? -Math.PI / 2 : Math.PI / 2 };
});
export const DEALER_BAY = { depth: BAY_DEPTH, width: BAY_WIDTH };
