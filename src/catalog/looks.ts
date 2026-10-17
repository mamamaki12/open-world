// アバターの見た目（性別・体型・肌・顔・髪型・髪色）。共有ワールドで毎回送るので、短いIDと番号だけにする
export type Sex = 'm' | 'f';
export type Build = 'slim' | 'normal' | 'sturdy';

export interface Looks {
  sex: Sex;
  build: Build;
  /** SKIN_TONES の番号 */
  skin: number;
  /** FACES の番号 */
  face: number;
  /** HAIR_STYLES の id */
  hair: string;
  /** HAIR_COLORS の番号 */
  hairColor: number;
}

export const SEX_NAMES: Record<Sex, string> = { m: '男性', f: '女性' };
export const BUILDS: { id: Build; name: string; width: number }[] = [
  { id: 'slim', name: '細め', width: 0.92 },
  { id: 'normal', name: 'ふつう', width: 1 },
  { id: 'sturdy', name: 'がっしり', width: 1.1 },
];
export const SKIN_TONES = ['#f6dcc4', '#eec7a3', '#e0b18a', '#c98e64', '#a26a46', '#6f4a33'];
export const FACES: { name: string; eye: number; brow: number; nose: number }[] = [
  { name: 'やさしい', eye: 1, brow: 0.05, nose: 1 },
  { name: 'きりっと', eye: 0.85, brow: -0.18, nose: 1.1 },
  { name: 'ぱっちり', eye: 1.3, brow: 0.12, nose: 0.85 },
  { name: 'おだやか', eye: 0.75, brow: 0.2, nose: 1 },
];

export type HairShape = 'buzz' | 'short' | 'twoblock' | 'mash' | 'bob' | 'long' | 'pony' | 'bun' | 'wavy';
export interface HairStyle { id: string; name: string; shape: HairShape; price: number }
/** 美容室の料金（カット）。作成画面では無料 */
export const HAIR_STYLES: HairStyle[] = [
  { id: 'buzz', name: 'ボウズ', shape: 'buzz', price: 2_000 },
  { id: 'short', name: 'ショート', shape: 'short', price: 4_500 },
  { id: 'twoblock', name: 'ツーブロック', shape: 'twoblock', price: 5_500 },
  { id: 'mash', name: 'マッシュ', shape: 'mash', price: 6_000 },
  { id: 'bob', name: 'ボブ', shape: 'bob', price: 6_500 },
  { id: 'wavy', name: 'ゆるふわパーマ', shape: 'wavy', price: 12_000 },
  { id: 'long', name: 'ロング', shape: 'long', price: 7_000 },
  { id: 'pony', name: 'ポニーテール', shape: 'pony', price: 7_000 },
  { id: 'bun', name: 'お団子', shape: 'bun', price: 7_500 },
];
export const HAIR_COLORS: { name: string; color: string }[] = [
  { name: '黒', color: '#1d1916' },
  { name: 'こげ茶', color: '#3b2a1e' },
  { name: 'ブラウン', color: '#6b4528' },
  { name: 'ミルクティー', color: '#b48e68' },
  { name: '金髪', color: '#d8b36a' },
  { name: 'アッシュグレー', color: '#8a8a8c' },
  { name: '赤', color: '#8c2b22' },
  { name: 'ネイビー', color: '#26304f' },
  { name: 'ピンク', color: '#d9849c' },
];
/** カラー（染める）の料金。黒・こげ茶へ戻すのは安い */
export const colorPrice = (i: number) => (i <= 1 ? 4_000 : 9_000);

export const DEFAULT_LOOKS: Looks = { sex: 'm', build: 'normal', skin: 1, face: 0, hair: 'short', hairColor: 0 };

export const getHair = (id: string) => HAIR_STYLES.find((h) => h.id === id) ?? HAIR_STYLES[1];
export const buildWidth = (b: Build) => BUILDS.find((x) => x.id === b)?.width ?? 1;

const idx = (v: unknown, n: number, d: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : d);

/** 保存データや他のプレイヤーから来た値を、必ず描ける見た目に直す */
export function sanitizeLooks(v: unknown): Looks {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Looks>;
  return {
    sex: o.sex === 'f' ? 'f' : 'm',
    build: BUILDS.some((b) => b.id === o.build) ? (o.build as Build) : 'normal',
    skin: idx(o.skin, SKIN_TONES.length, DEFAULT_LOOKS.skin),
    face: idx(o.face, FACES.length, 0),
    hair: HAIR_STYLES.some((h) => h.id === o.hair) ? (o.hair as string) : DEFAULT_LOOKS.hair,
    hairColor: idx(o.hairColor, HAIR_COLORS.length, 0),
  };
}

/** 美容室の会計：髪型を変えればカット代、色を変えればカラー代 */
export function salonCost(now: Looks, next: Pick<Looks, 'hair' | 'hairColor'>): number {
  return (next.hair !== now.hair ? getHair(next.hair).price : 0) + (next.hairColor !== now.hairColor ? colorPrice(next.hairColor) : 0);
}
