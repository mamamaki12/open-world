// 服屋さん4店舗。南西の商店街2軒と北側2軒に分散する。
// 座標はほかの店と同じく civic site 基準。正面（入口）は道路側（-Z）。
import { TOWN_BOUNDS } from '../economy/town';
import { shopSite, SHOPPING_SOUTH, SHOPPING_NORTH, SHOPPING_WEST } from './shopSites';

export type BoutiqueId = 'maison' | 'atelier' | 'urban' | 'daily';
export const BOUTIQUE_IDS: BoutiqueId[] = ['maison', 'atelier', 'urban', 'daily'];

export interface BoutiqueInfo {
  name: string;
  /** 看板の下に入れる短い説明 */
  tagline: string;
  /** 価格帯の呼び名 */
  tier: string;
  floor: string;
  wall: string;
  trim: string;
  /** 外壁・看板・ドア枠 */
  facade: string;
  sign: string;
  signText: string;
  frame: string;
  height: number;
}

export const BOUTIQUE_INFO: Record<BoutiqueId, BoutiqueInfo> = {
  maison: { name: 'MAISON VÉRANE', tagline: 'PARIS · TOKYO', tier: 'ハイブランド', floor: '#d9d2c4', wall: '#f3efe6', trim: '#b89a5a', facade: '#1b1a1c', sign: '#1b1a1c', signText: '#d9bd7a', frame: '#b89a5a', height: 6 },
  atelier: { name: 'ATELIER KOU', tagline: 'DESIGNERS & SELECT', tier: 'デザイナーズ', floor: '#b99a76', wall: '#ece4d7', trim: '#6e5640', facade: '#8b6d50', sign: '#efe7da', signText: '#4a3a2b', frame: '#4a3a2b', height: 5 },
  urban: { name: 'URBAN THREAD', tagline: 'CASUAL & STREET', tier: 'カジュアル', floor: '#9fa6a8', wall: '#e8ecec', trim: '#2f6d8e', facade: '#2f6d8e', sign: '#ffffff', signText: '#2f6d8e', frame: '#24485c', height: 4.6 },
  daily: { name: 'DAILY WEAR', tagline: '毎日の服を、毎日の値段で', tier: 'ファストファッション', floor: '#e4e1d8', wall: '#ffffff', trim: '#d6332f', facade: '#f4f1ea', sign: '#d6332f', signText: '#ffffff', frame: '#8c8c8c', height: 4.6 },
};

/** 店の幅・奥行き（m） */
export const BOUTIQUE_W = 9.5, BOUTIQUE_D = 9;

export const BOUTIQUES: Record<BoutiqueId, { x0: number; x1: number; z0: number; z1: number }> = {
  daily: shopSite(SHOPPING_WEST, SHOPPING_SOUTH, BOUTIQUE_W, BOUTIQUE_D),
  atelier: shopSite(SHOPPING_WEST + 25, SHOPPING_SOUTH, BOUTIQUE_W, BOUTIQUE_D),
  maison: shopSite(TOWN_BOUNDS.x0 + 40, SHOPPING_NORTH, BOUTIQUE_W, BOUTIQUE_D),
  urban: shopSite(TOWN_BOUNDS.x1 - 40, SHOPPING_NORTH, BOUTIQUE_W, BOUTIQUE_D),
};

export const BOUTIQUE_DOOR = { width: 2.2, height: 2.6 };

export function isBoutique(v: string | null | undefined): v is BoutiqueId {
  return !!v && (BOUTIQUE_IDS as string[]).includes(v);
}

/** 店内の什器（上から見た矩形・店の中央が原点）。左右の壁ぎわにハンガーラック、中央に平台、奥にレジと試着室 */
export const BOUTIQUE_FIXTURES = [
  { x: -3.9, z: 0.6, w: 0.7, d: 5 },
  { x: 3.9, z: 0.6, w: 0.7, d: 5 },
  { x: 0, z: -0.4, w: 1.8, d: 1.1 },
  { x: -1.4, z: 3.75, w: 3, d: 0.8 },
  { x: 3.35, z: 3.6, w: 2, d: 1.1 },
  // 入口の左右のショーウィンドウ（マネキンの台）
  { x: -3.3, z: -3.8, w: 2.4, d: 0.9 },
  { x: 3.3, z: -3.8, w: 2.4, d: 0.9 },
  // 小物のガラスケースと入口わきの植物
  { x: 1.3, z: 1.9, w: 1, d: 0.5 },
  { x: -4.25, z: -2.65, w: 0.45, d: 0.45 },
  { x: 4.25, z: -2.65, w: 0.45, d: 0.45 },
];

/** 店内で F を押せる場所 */
export const BOUTIQUE_ACTIONS = [
  { id: 'browse', label: '服を見る・買う', x: 0, z: -1.6 },
  { id: 'rack-l', label: '服を見る・買う', x: -2.9, z: 0.6 },
  { id: 'rack-r', label: '服を見る・買う', x: 2.9, z: 0.6 },
  { id: 'register', label: 'レジで服を買う', x: -1.4, z: 2.6 },
  { id: 'fitting', label: '試着室で着替える', x: 3.35, z: 2.4 },
];
