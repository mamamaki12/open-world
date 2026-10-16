// 不動産の相場、土地、毎日の維持費・税金・家賃。
import type { Rng } from './rng';
import { gauss, pick, randInt } from './rng';

/** ゲーム内の1日の長さ（実時間の秒）。遊んでいる間だけ進む */
export const DAY_SECONDS = 60;

/**
 * 相場（1.0 が平均）を1日進める。平均へ戻ろうとする力のあるランダムウォーク（対数で計算）。
 * たまに好況・不況の大きな動きが出る。
 */
export function stepMarket(index: number, rng: Rng, bias = 1): number {
  // bias: 季節・天気で少しずれる「平均」（src/world/climate.ts climateMarketFactor）
  const x = Math.log(index) - Math.log(bias);
  const shock = rng() < 0.04 ? gauss(rng) * 0.12 : 0;
  const next = Math.log(bias) + x - 0.06 * x + gauss(rng) * 0.035 + shock;
  return Math.round(Math.min(Math.max(Math.exp(next), 0.5), 2) * 1000) / 1000;
}

export interface Location {
  id: string;
  name: string;
  /** 土地の値段（相場 1.0 のとき） */
  land: number;
  /** 建物の査定・家賃にかかる立地の係数 */
  factor: number;
}

export const LOCATIONS: Location[] = [
  { id: 'rural', name: '郊外の住宅地', land: 5_000_000, factor: 0.9 },
  { id: 'town', name: '静かな住宅街', land: 12_000_000, factor: 1.0 },
  { id: 'station', name: '駅近', land: 25_000_000, factor: 1.15 },
  { id: 'city', name: '都心の一等地', land: 60_000_000, factor: 1.3 },
];

export function getLocation(id: string): Location {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}

const TOWNS = ['桜台', '緑ヶ丘', '港南', '東町', '若葉', '旭', '本町', '青葉台', '星川', '大和田', '光が丘', '中央'];

export interface LandOffer {
  id: string;
  name: string;
  location: string;
  /** 土地の値段のぶれ（0.85〜1.2） */
  variance: number;
  /** 町のどの区画か（src/economy/town.ts） */
  plot?: number;
}

/** 不動産屋に並ぶ売り土地（毎日入れ替わる） */
export function landOffers(day: number, rng: Rng): LandOffer[] {
  return LOCATIONS.map((loc, i) => ({
    id: `land-${day}-${i}-${randInt(rng, 1e6).toString(36)}`,
    name: `${pick(rng, TOWNS)}${randInt(rng, 5) + 1}丁目`,
    location: loc.id,
    variance: Math.round((0.85 + rng() * 0.35) * 100) / 100,
  }));
}

/** 土地の今の値段 */
export function landPrice(location: string, variance: number, market: number): number {
  return Math.round((getLocation(location).land * variance * market) / 10000) * 10000;
}

/** 家と土地をまとめて売るときの値段 = (建物の査定 + 土地) × 相場 */
export function salePrice(buildingAppraisal: number, location: string, variance: number, market: number): number {
  return Math.round(((buildingAppraisal + getLocation(location).land * variance) * market) / 10000) * 10000;
}

/** 毎日の出入り */
export const DAILY = {
  /** 維持費：建物の建築費に対する割合 */
  upkeep: 0.0005,
  /** 固定資産税：土地＋建物の評価額に対する割合 */
  tax: 0.0003,
  /** 家賃：売値に対する割合（貸している間だけ） */
  rent: 0.003,
};

export interface DailyBill {
  upkeep: number;
  tax: number;
  rent: number;
}

export function dailyBill(p: { buildCost: number; appraisal: number; landValue: number; rented: boolean; market: number }): DailyBill {
  return {
    upkeep: Math.round(p.buildCost * DAILY.upkeep),
    tax: Math.round((p.landValue + p.appraisal) * DAILY.tax),
    rent: p.rented && p.buildCost > 0 ? Math.round((p.appraisal + p.landValue) * p.market * DAILY.rent) : 0,
  };
}
