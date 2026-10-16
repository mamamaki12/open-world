// 車のカスタム（カスタムショップで施工する）。見た目と走りの両方に効く。
import type { CarDef } from './cars';

export type PaintFinish = 'solid' | 'metallic' | 'pearl' | 'matte' | 'chrome';
export type Livery = 'none' | 'stripes' | 'side' | 'twotone' | 'racing';
export type EngineId = 'stock' | 'turbo' | 'v6tt' | 'rotary' | 'v8' | 'v12' | 'electric';
export type WheelStyle = 'stock' | 'mesh' | 'deep' | 'dish' | 'spoke6' | 'offroad';
export type WingId = 'stock' | 'none' | 'lip' | 'ducktail' | 'gt' | 'swan';

export interface CarMods {
  finish: PaintFinish;
  livery: Livery;
  /** ストライプ・ツートーンの色 */
  accent: string;
  engine: EngineId;
  wheel: WheelStyle;
  /** 純正からのインチアップ（0〜3） */
  wheelSize: number;
  wheelColor: string;
  /** ネガティブキャンバー（度、0〜12） */
  camber: number;
  /** 車高（純正からのcm、-10〜+10） */
  rideHeight: number;
  wing: WingId;
  /** 窓のスモーク（0〜3） */
  tint: number;
}

export const STOCK_MODS: CarMods = {
  finish: 'metallic', livery: 'none', accent: '#151515', engine: 'stock', wheel: 'stock', wheelSize: 0,
  wheelColor: '#c1c6ca', camber: 0, rideHeight: 0, wing: 'stock', tint: 0,
};

interface Option<T> { id: T; name: string; price: number; note?: string }
export const FINISHES: Option<PaintFinish>[] = [
  { id: 'solid', name: 'ソリッド', price: 0 },
  { id: 'metallic', name: 'メタリック', price: 100000 },
  { id: 'pearl', name: 'パール', price: 180000 },
  { id: 'matte', name: 'マット（つや消し）', price: 300000 },
  { id: 'chrome', name: 'クローム', price: 800000 },
];
export const LIVERIES: Option<Livery>[] = [
  { id: 'none', name: 'なし', price: 0 },
  { id: 'stripes', name: 'センターストライプ', price: 80000 },
  { id: 'side', name: 'サイドライン', price: 50000 },
  { id: 'twotone', name: 'ツートーン（ルーフ）', price: 150000 },
  { id: 'racing', name: 'レーシング（ゼッケン付き）', price: 200000 },
];
export interface EngineDef extends Option<EngineId> { power: number; top: number; cylinders: number; layout: string }
/** power/top は純正エンジンに対する加速と最高速の倍率 */
export const ENGINES: EngineDef[] = [
  { id: 'stock', name: '純正エンジン', price: 0, power: 1, top: 1, cylinders: 4, layout: '純正' },
  { id: 'turbo', name: 'ボルトオンターボ', price: 600000, power: 1.25, top: 1.08, cylinders: 4, layout: '直列4気筒ターボ', note: '過給で中速から力強く' },
  { id: 'v6tt', name: 'V6 ツインターボ', price: 1500000, power: 1.45, top: 1.15, cylinders: 6, layout: 'V型6気筒ツインターボ', note: '低回転からトルクが太い' },
  { id: 'rotary', name: '13B ロータリー', price: 1800000, power: 1.4, top: 1.2, cylinders: 2, layout: '2ローター', note: '高回転まで一気に回る' },
  { id: 'v8', name: 'V8 5.0L', price: 2500000, power: 1.6, top: 1.22, cylinders: 8, layout: 'V型8気筒 自然吸気', note: '野太い音と大トルク' },
  { id: 'v12', name: 'V12 6.5L', price: 6000000, power: 1.85, top: 1.32, cylinders: 12, layout: 'V型12気筒', note: '最上級のパワーと滑らかさ' },
  { id: 'electric', name: 'デュアルモーター EV', price: 3500000, power: 1.75, top: 1.15, cylinders: 0, layout: '電気モーター×2', note: '踏んだ瞬間に最大トルク' },
];
export const WHEELS: Option<WheelStyle>[] = [
  { id: 'stock', name: '純正 5本スポーク', price: 0 },
  { id: 'mesh', name: 'メッシュ', price: 280000 },
  { id: 'deep', name: '深リム', price: 340000 },
  { id: 'dish', name: 'ディッシュ', price: 220000 },
  { id: 'spoke6', name: '6本スポーク', price: 240000 },
  { id: 'offroad', name: 'オフロード（ビードロック）', price: 300000 },
];
export const WINGS: Option<WingId>[] = [
  { id: 'stock', name: '純正', price: 0 },
  { id: 'none', name: 'なし（取り外し）', price: 20000 },
  { id: 'lip', name: 'リップスポイラー', price: 50000 },
  { id: 'ducktail', name: 'ダックテール', price: 120000 },
  { id: 'gt', name: 'GTウィング', price: 350000 },
  { id: 'swan', name: 'スワンネックウィング', price: 500000 },
];
export const PAINT_COLORS = ['#eceeea', '#101418', '#9ca8b3', '#b52734', '#d81f26', '#204f7b', '#2b7fd1', '#d5ab45', '#f2cf1d', '#46624e', '#3fa65a', '#e27830', '#7b3fa0', '#e46aa3', '#5ec4c9', '#6b4a32'];
export const WHEEL_COLORS = ['#c1c6ca', '#1b1d20', '#d4af37', '#8a8f94', '#e9e9e4', '#b52734', '#2b7fd1', '#c06a2b'];
/** 部品ごとの工賃 */
export const LABOR = { paint: 250000, accent: 40000, wheelSize: 60000, wheelColor: 40000, camber: 80000, rideHeight: 150000, tint: 30000, revert: 30000 };
export const LIMITS = { wheelSize: [0, 3], camber: [0, 12], rideHeight: [-10, 10], tint: [0, 3] } as const;

const HEX = /^#[0-9a-f]{6}$/i;
const pick = <T extends string>(list: { id: T }[], v: unknown, d: T): T => list.some(o => o.id === v) ? v as T : d;
const clamp = (v: unknown, [lo, hi]: readonly [number, number], d: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(lo, Math.min(hi, v))) : d;
/** 保存データを読み込むとき、壊れた値は純正に戻す */
export function cleanMods(v: unknown): CarMods {
  const m = (v && typeof v === 'object' ? v : {}) as Partial<Record<keyof CarMods, unknown>>;
  return {
    finish: pick(FINISHES, m.finish, STOCK_MODS.finish), livery: pick(LIVERIES, m.livery, 'none'),
    accent: typeof m.accent === 'string' && HEX.test(m.accent) ? m.accent : STOCK_MODS.accent,
    engine: pick(ENGINES, m.engine, 'stock'), wheel: pick(WHEELS, m.wheel, 'stock'),
    wheelSize: clamp(m.wheelSize, LIMITS.wheelSize, 0),
    wheelColor: typeof m.wheelColor === 'string' && HEX.test(m.wheelColor) ? m.wheelColor : STOCK_MODS.wheelColor,
    camber: clamp(m.camber, LIMITS.camber, 0), rideHeight: clamp(m.rideHeight, LIMITS.rideHeight, 0),
    wing: pick(WINGS, m.wing, 'stock'), tint: clamp(m.tint, LIMITS.tint, 0),
  };
}

export interface ModLine { label: string; price: number }
/** 変えた部分だけの見積もり。純正に戻す部品は工賃だけかかる。 */
export function quote(before: { color: string; mods: CarMods }, after: { color: string; mods: CarMods }): ModLine[] {
  const a = before.mods, b = after.mods, lines: ModLine[] = [];
  const part = <T extends string>(label: string, list: Option<T>[], from: T, to: T, base: T) => {
    if (from === to) return;
    const o = list.find(x => x.id === to)!;
    lines.push({ label: label + '：' + o.name, price: to === base ? LABOR.revert : o.price });
  };
  if (before.color.toLowerCase() !== after.color.toLowerCase() || a.finish !== b.finish) {
    lines.push({ label: '全塗装：' + FINISHES.find(f => f.id === b.finish)!.name, price: LABOR.paint + FINISHES.find(f => f.id === b.finish)!.price });
  }
  if (a.livery !== b.livery) part('デザイン', LIVERIES, a.livery, b.livery, 'none');
  else if (b.livery !== 'none' && a.accent.toLowerCase() !== b.accent.toLowerCase()) lines.push({ label: 'デザインの色替え', price: LABOR.accent });
  part('エンジン載せ替え', ENGINES, a.engine, b.engine, 'stock');
  part('ホイール', WHEELS, a.wheel, b.wheel, 'stock');
  if (a.wheelSize !== b.wheelSize) lines.push({ label: `ホイールサイズ +${b.wheelSize}インチ`, price: b.wheelSize ? LABOR.wheelSize * b.wheelSize : LABOR.revert });
  if (a.wheelColor.toLowerCase() !== b.wheelColor.toLowerCase()) lines.push({ label: 'ホイールの色', price: LABOR.wheelColor });
  if (a.camber !== b.camber) lines.push({ label: `キャンバー −${b.camber}°`, price: LABOR.camber });
  if (a.rideHeight !== b.rideHeight) lines.push({ label: `車高 ${b.rideHeight > 0 ? '+' : ''}${b.rideHeight}cm`, price: LABOR.rideHeight });
  part('リアウィング', WINGS, a.wing, b.wing, 'stock');
  if (a.tint !== b.tint) lines.push({ label: `スモークフィルム ${['なし', 'ライト', 'ミドル', 'リムジン'][b.tint]}`, price: LABOR.tint });
  return lines;
}
export const quoteTotal = (lines: ModLine[]) => lines.reduce((s, l) => s + l.price, 0);

/** カスタムを反映した走りの性能。grip は高速でのハンドルの効き（1 = 純正）。 */
export interface TunedCar extends CarDef { grip: number }
export function tunedCar(def: CarDef, mods: CarMods = STOCK_MODS): TunedCar {
  const e = ENGINES.find(x => x.id === mods.engine)!;
  // 少しのネガキャンと低い車高は曲がりやすく、付けすぎると接地が減る。大きなウィングは高速で安定するが空気抵抗が増える
  const camber = mods.camber <= 3 ? mods.camber * .03 : .09 - (mods.camber - 3) * .025;
  const height = mods.rideHeight < 0 ? -mods.rideHeight * .008 : -mods.rideHeight * .01;
  const wing = mods.wing === 'gt' || mods.wing === 'swan' ? .1 : mods.wing === 'ducktail' ? .04 : 0;
  const drag = mods.wing === 'gt' || mods.wing === 'swan' ? .98 : 1;
  const wheel = def.wheel * (1 + mods.wheelSize * .03) * (mods.wheel === 'offroad' ? 1.06 : 1);
  return {
    ...def, wheel, power: def.power * e.power, maxSpeed: def.maxSpeed * e.top * drag,
    height: def.height + mods.rideHeight / 100 + (wheel - def.wheel),
    grip: Math.max(.75, 1 + camber + height + wing),
  };
}
/** 表示用の馬力（架空）。power 1 ≒ 45PS */
export const horsepower = (car: CarDef) => Math.round(car.power * 45);
/** 0→40km/h の加速（秒） */
export const zeroTo40 = (car: CarDef) => Math.min(40 / 3.6, car.maxSpeed) / car.power;
