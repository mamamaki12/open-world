// 美容室。西の商店街の証券取引所の隣。座標は civic site 基準。
import { shopSite, SHOPPING_SOUTH, SHOPPING_WEST } from './shopSites';

export const SALON = { ...shopSite(SHOPPING_WEST + 51, SHOPPING_SOUTH, 9.5, 9), height: 4.6 };
export const SALON_NAME = 'HAIR SALON LUCE';
/** 店内（店の中央が原点）：左の壁ぎわにカット台3つ、奥にシャンプー台、右奥に受付 */
export const SALON_CHAIRS = [-2.4, 0, 2.4];
export const SALON_FIXTURES = [
  ...SALON_CHAIRS.map((z) => ({ x: -3.75, z, w: 1.5, d: 1.1 })),
  { x: -1.2, z: 3.85, w: 3, d: 1 },
  { x: 3.1, z: 2.4, w: 2.4, d: 0.8 },
  { x: 3.5, z: -2.4, w: 1.4, d: 2.2 },
];
export const SALON_ACTIONS = [
  { id: 'cut', label: '髪を切る・染める', x: -2.5, z: 0 },
  { id: 'cut2', label: '髪を切る・染める', x: -2.5, z: -2.4 },
  { id: 'cut3', label: '髪を切る・染める', x: -2.5, z: 2.4 },
  { id: 'desk', label: '受付で髪型を相談する', x: 3.1, z: 1.2 },
];
