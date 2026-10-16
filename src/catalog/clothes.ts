// 服のカタログ。ブランドはすべて架空。店ごとに価格帯がはっきり違う（ハイブランド → ファストファッション）
import type { BoutiqueId } from '../building/boutiques';

export type Slot = 'top' | 'bottom' | 'shoes' | 'hat';
export const SLOTS: Slot[] = ['top', 'bottom', 'shoes', 'hat'];
export const SLOT_NAMES: Record<Slot, string> = { top: 'トップス', bottom: 'ボトムス', shoes: 'シューズ', hat: '帽子' };

/** 見た目の形。アバターの描き分けに使う */
export type TopStyle = 'tee' | 'shirt' | 'knit' | 'hoodie' | 'jacket' | 'coat';
export type BottomStyle = 'pants' | 'shorts' | 'skirt';
export type ShoeStyle = 'sneaker' | 'leather' | 'boot';
export type HatStyle = 'cap' | 'beanie' | 'hat';

export interface Garment {
  id: string;
  /** 売っている店。null は最初から持っている服 */
  shop: BoutiqueId | null;
  slot: Slot;
  style: TopStyle | BottomStyle | ShoeStyle | HatStyle;
  name: string;
  price: number;
  color: string;
  /** ジャケットの中のシャツ、パーカーのひも、帽子のリボンなど */
  accent?: string;
  note: string;
}

type G = Omit<Garment, 'shop'>;
const shop = (s: BoutiqueId, items: G[]): Garment[] => items.map((g) => ({ ...g, shop: s }));

export const STARTER: Garment[] = [
  { id: 'starter-tee', shop: null, slot: 'top', style: 'tee', name: 'いつものTシャツ', price: 0, color: '#3e6fa8', note: '最初から着ている青いTシャツ。' },
  { id: 'starter-pants', shop: null, slot: 'bottom', style: 'pants', name: 'いつものパンツ', price: 0, color: '#2f3540', note: '最初からはいている紺のパンツ。' },
  { id: 'starter-shoes', shop: null, slot: 'shoes', style: 'sneaker', name: 'いつものスニーカー', price: 0, color: '#1c1c1e', note: '最初からはいている黒いスニーカー。' },
];

export const GARMENTS: Garment[] = [
  ...STARTER,
  ...shop('maison', [
    { id: 'mv-coat', slot: 'top', style: 'coat', name: 'カシミヤ ロングコート', price: 680_000, color: '#c8b293', accent: '#f4efe4', note: 'カシミヤ100%。膝まで届くキャメルのコート。' },
    { id: 'mv-jacket', slot: 'top', style: 'jacket', name: 'テーラードジャケット', price: 420_000, color: '#1c1c22', accent: '#f6f3ec', note: '職人が仕立てる黒のジャケット。白シャツを合わせて。' },
    { id: 'mv-knit', slot: 'top', style: 'knit', name: 'モノグラム ニット', price: 185_000, color: '#6d1f2a', note: '深いボルドーのウールニット。' },
    { id: 'mv-shirt', slot: 'top', style: 'shirt', name: 'シルク ドレスシャツ', price: 128_000, color: '#f3f0e8', accent: '#d9bd7a', note: '光沢のあるシルクのシャツ。' },
    { id: 'mv-trousers', slot: 'bottom', style: 'pants', name: 'ウール スラックス', price: 152_000, color: '#2a2a30', note: 'センタープレスの細身スラックス。' },
    { id: 'mv-skirt', slot: 'bottom', style: 'skirt', name: 'プリーツ スカート', price: 168_000, color: '#1c1c22', note: '細かいプリーツのロングスカート。' },
    { id: 'mv-loafer', slot: 'shoes', style: 'leather', name: 'レザー ローファー', price: 238_000, color: '#3a2116', note: 'イタリアの革で作ったローファー。' },
    { id: 'mv-fedora', slot: 'hat', style: 'hat', name: 'フェルト ハット', price: 96_000, color: '#2b2622', accent: '#b89a5a', note: '金のリボン付きのつば広ハット。' },
  ]),
  ...shop('atelier', [
    { id: 'ak-coat', slot: 'top', style: 'coat', name: 'ウールブレンド コート', price: 68_000, color: '#5d6b5a', accent: '#e6e0d2', note: 'オリーブ色のノーカラーコート。' },
    { id: 'ak-jacket', slot: 'top', style: 'jacket', name: 'リネン ジャケット', price: 46_000, color: '#b9a888', accent: '#ffffff', note: '春夏向けの軽いジャケット。' },
    { id: 'ak-shirt', slot: 'top', style: 'shirt', name: 'オーバーサイズ シャツ', price: 22_000, color: '#9fb6c8', accent: '#e9eef2', note: 'くすんだブルーのゆったりシャツ。' },
    { id: 'ak-knit', slot: 'top', style: 'knit', name: 'モヘア カーディガン', price: 31_000, color: '#d9c7a3', note: 'ふんわりしたモヘアのニット。' },
    { id: 'ak-wide', slot: 'bottom', style: 'pants', name: 'ワイドパンツ', price: 26_000, color: '#6e5640', note: 'ブラウンのワイドシルエット。' },
    { id: 'ak-skirt', slot: 'bottom', style: 'skirt', name: 'フレア スカート', price: 24_000, color: '#8a5a44', note: 'テラコッタ色のフレアスカート。' },
    { id: 'ak-boots', slot: 'shoes', style: 'boot', name: 'サイドゴア ブーツ', price: 39_000, color: '#4a3a2b', note: 'スエードのショートブーツ。' },
    { id: 'ak-hat', slot: 'hat', style: 'hat', name: 'バケットハット', price: 15_000, color: '#d8ceb8', accent: '#6e5640', note: 'コットンのやわらかいハット。' },
  ]),
  ...shop('urban', [
    { id: 'ut-hoodie', slot: 'top', style: 'hoodie', name: 'ロゴ パーカー', price: 9_900, color: '#7a8a96', accent: '#ffffff', note: '裏起毛のスウェットパーカー。' },
    { id: 'ut-jacket', slot: 'top', style: 'jacket', name: 'デニム ジャケット', price: 14_900, color: '#4e6d92', accent: '#f2f2f2', note: '定番のデニムジャケット。' },
    { id: 'ut-tee', slot: 'top', style: 'tee', name: 'グラフィック Tシャツ', price: 4_900, color: '#e7b43c', note: '目立つマスタード色のTシャツ。' },
    { id: 'ut-shirt', slot: 'top', style: 'shirt', name: 'チェック ネルシャツ', price: 6_900, color: '#a33a32', accent: '#2a2a2a', note: '赤のネルシャツ。' },
    { id: 'ut-jeans', slot: 'bottom', style: 'pants', name: 'ストレート ジーンズ', price: 7_900, color: '#3d5a80', note: 'ほどよい色落ちのジーンズ。' },
    { id: 'ut-shorts', slot: 'bottom', style: 'shorts', name: 'カーゴ ショーツ', price: 5_900, color: '#7c7552', note: 'ポケットの多いショートパンツ。' },
    { id: 'ut-sneaker', slot: 'shoes', style: 'sneaker', name: 'ハイカット スニーカー', price: 11_900, color: '#f2f2ee', accent: '#2f6d8e', note: '白のハイカット。' },
    { id: 'ut-cap', slot: 'hat', style: 'cap', name: 'ベースボール キャップ', price: 3_900, color: '#2f6d8e', note: '刺しゅうロゴのキャップ。' },
  ]),
  ...shop('daily', [
    { id: 'dw-tee', slot: 'top', style: 'tee', name: 'クルーネック Tシャツ', price: 990, color: '#ffffff', note: '着回しやすい白T。' },
    { id: 'dw-tee-black', slot: 'top', style: 'tee', name: 'クルーネック Tシャツ（黒）', price: 990, color: '#222224', note: '何にでも合う黒T。' },
    { id: 'dw-hoodie', slot: 'top', style: 'hoodie', name: 'スウェット パーカー', price: 2_990, color: '#3f6a4c', accent: '#e9e9e9', note: 'グリーンのパーカー。' },
    { id: 'dw-knit', slot: 'top', style: 'knit', name: 'コットン セーター', price: 1_990, color: '#e6dcc5', note: 'ベージュのセーター。' },
    { id: 'dw-chino', slot: 'bottom', style: 'pants', name: 'チノパンツ', price: 1_990, color: '#b39a6f', note: 'ベージュのチノパン。' },
    { id: 'dw-shorts', slot: 'bottom', style: 'shorts', name: 'イージー ショーツ', price: 1_290, color: '#384a63', note: 'ウエストゴムのショートパンツ。' },
    { id: 'dw-skirt', slot: 'bottom', style: 'skirt', name: 'ナロー スカート', price: 1_990, color: '#5b5f66', note: 'グレーのロングスカート。' },
    { id: 'dw-sneaker', slot: 'shoes', style: 'sneaker', name: 'キャンバス スニーカー', price: 2_490, color: '#d6332f', accent: '#ffffff', note: '赤いキャンバススニーカー。' },
    { id: 'dw-beanie', slot: 'hat', style: 'beanie', name: 'ニット帽', price: 790, color: '#e2a33c', note: 'からし色のニット帽。' },
  ]),
];

export function getGarment(id: string | null | undefined): Garment | undefined {
  return id ? GARMENTS.find((g) => g.id === id) : undefined;
}
export function garmentsOf(shopId: BoutiqueId): Garment[] {
  return GARMENTS.filter((g) => g.shop === shopId);
}

export type Outfit = Record<Slot, string | null>;
export const DEFAULT_OUTFIT: Outfit = { top: 'starter-tee', bottom: 'starter-pants', shoes: 'starter-shoes', hat: null };
export const STARTER_IDS = STARTER.map((g) => g.id);

export interface WardrobeData {
  owned: string[];
  outfit: Outfit;
}

/** 古いセーブや壊れたデータを、遊べる形に直す（知らない服は捨て、着ている服は持っている服だけ） */
export function sanitizeWardrobe(raw: unknown): WardrobeData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<WardrobeData>;
  const owned = [...new Set([...STARTER_IDS, ...(Array.isArray(d.owned) ? d.owned : []).filter((id) => typeof id === 'string' && getGarment(id))])];
  const outfit = { ...DEFAULT_OUTFIT };
  const src = (d.outfit && typeof d.outfit === 'object' ? d.outfit : {}) as Partial<Outfit>;
  for (const slot of SLOTS) {
    if (!(slot in src)) continue;
    const id = src[slot];
    if (id === null) { if (slot === 'hat') outfit.hat = null; continue; }
    const g = getGarment(id);
    if (g && g.slot === slot && owned.includes(g.id)) outfit[slot] = g.id;
  }
  return { owned, outfit };
}

/** 服を買う。足りなければエラー文。買ったらすぐ着る */
export function purchase(d: WardrobeData, id: string, money: number): { data: WardrobeData; cost: number } | string {
  const g = getGarment(id);
  if (!g || !g.shop) return 'この服は売っていません';
  if (d.owned.includes(id)) return 'もう持っています';
  if (g.price > money) return 'お金が足りません';
  return { data: { owned: [...d.owned, id], outfit: { ...d.outfit, [g.slot]: id } }, cost: g.price };
}

/** 持っている服に着替える。帽子だけは脱げる（id = null） */
export function wear(d: WardrobeData, slot: Slot, id: string | null): WardrobeData {
  if (id === null) return slot === 'hat' ? { ...d, outfit: { ...d.outfit, hat: null } } : d;
  const g = getGarment(id);
  if (!g || g.slot !== slot || !d.owned.includes(id)) return d;
  return { ...d, outfit: { ...d.outfit, [slot]: id } };
}
