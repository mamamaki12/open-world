// バイトのミニゲーム：問題づくりと採点・給料（画面は src/ui/jobs）
import { pick, randInt, type Rng } from './rng';

export type JobId = 'register' | 'warehouse' | 'burger' | 'traffic';

export interface JobDef {
  id: JobId;
  name: string;
  place: string;
  /** 何をする仕事か（一覧に出す） */
  desc: string;
  /** 1シフトの長さ（秒） */
  seconds: number;
  /** 基本給（1シフト） */
  base: number;
  /** 1件うまくできるごとの出来高 */
  perTask: number;
  /** 1件ミスするごとの減額 */
  penalty: number;
  /** 最低保証 */
  minPay: number;
}

export const JOBS: JobDef[] = [
  { id: 'register', name: 'コンビニのレジ', place: 'コンビニ', desc: '商品をスキャンして、お客さんにおつりを渡す', seconds: 60, base: 6000, perTask: 2500, penalty: 2000, minPay: 3000 },
  { id: 'warehouse', name: '倉庫の仕分け', place: '物流センター', desc: '伝票の住所を見て、荷物を地域ごとのカゴに入れる', seconds: 45, base: 4000, perTask: 900, penalty: 1200, minPay: 2000 },
  { id: 'burger', name: 'ハンバーガー屋のキッチン', place: 'ハンバーガー屋', desc: '注文票どおりの順番で具を積んで出す', seconds: 60, base: 5000, perTask: 2000, penalty: 1500, minPay: 2500 },
  { id: 'traffic', name: '交通量調査', place: '交差点', desc: '目の前を通る車を種類ごとにカウンターで数える', seconds: 30, base: 8000, perTask: 300, penalty: 400, minPay: 4000 },
];

export const jobDef = (id: JobId): JobDef => JOBS.find((j) => j.id === id)!;

/** シフトの給料。ok = できた件数、miss = ミスの件数 */
export function shiftPay(def: JobDef, ok: number, miss: number): number {
  return Math.max(def.minPay, def.base + ok * def.perTask - miss * def.penalty);
}

// ---------- コンビニのレジ ----------

export interface Item { name: string; price: number }

export const STORE_ITEMS: Item[] = [
  { name: 'おにぎり（鮭）', price: 162 }, { name: 'おにぎり（ツナマヨ）', price: 140 },
  { name: 'サンドイッチ', price: 298 }, { name: 'から揚げ弁当', price: 538 },
  { name: 'カップ麺', price: 236 }, { name: 'お茶 500ml', price: 151 },
  { name: 'コーヒー（ホット）', price: 120 }, { name: '牛乳 1L', price: 268 },
  { name: 'パン（メロンパン）', price: 159 }, { name: 'ポテトチップス', price: 171 },
  { name: 'チョコレート', price: 216 }, { name: 'ガム', price: 118 },
  { name: '雑誌', price: 680 }, { name: 'ビール 350ml', price: 237 },
  { name: '電池（単3×4）', price: 528 }, { name: 'アイス', price: 194 },
];

/** 日本のお金（おつりに使う） */
export const DENOMS = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1] as const;

export interface Checkout { items: Item[]; total: number; paid: number; change: number }

/** お客さんの払い方：ちょうど上の千円札・一万円札、端数をそろえて出す人もいる */
export function makeCheckout(rng: Rng): Checkout {
  const n = 1 + randInt(rng, 4);
  const items = Array.from({ length: n }, () => pick(rng, STORE_ITEMS));
  const total = items.reduce((s, i) => s + i.price, 0);
  const style = randInt(rng, 3);
  let paid: number;
  if (style === 0) paid = Math.ceil(total / 1000) * 1000; // 千円札で
  else if (style === 1) paid = total <= 5000 && rng() < 0.5 ? 5000 : 10000; // 大きいお札で
  else paid = Math.ceil(total / 1000) * 1000 + (total % 100); // 端数の小銭も出す（おつりの小銭を減らす）
  if (paid < total) paid = Math.ceil(total / 1000) * 1000;
  return { items, total, paid, change: paid - total };
}

/** おつりの枚数が一番少ない渡し方 */
export function fewestPieces(change: number): Record<number, number> {
  const out: Record<number, number> = {};
  let rest = change;
  for (const d of DENOMS) {
    const k = Math.floor(rest / d);
    if (k) out[d] = k;
    rest -= k * d;
  }
  return out;
}

export const sumPieces = (p: Record<number, number>) =>
  Object.entries(p).reduce((s, [d, k]) => s + Number(d) * k, 0);

// ---------- 倉庫の仕分け ----------

export const REGIONS = ['北海道', '東北', '関東', '中部', '近畿', '中国・四国', '九州・沖縄'] as const;
export type Region = (typeof REGIONS)[number];

const PREFS: Record<Region, string[]> = {
  北海道: ['北海道'],
  東北: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  関東: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  中部: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
  近畿: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  '中国・四国': ['鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県'],
  '九州・沖縄': ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
};

const CITIES: Record<string, string> = {
  北海道: '札幌市', 青森県: '青森市', 岩手県: '盛岡市', 宮城県: '仙台市', 秋田県: '秋田市', 山形県: '山形市', 福島県: '郡山市',
  茨城県: '水戸市', 栃木県: '宇都宮市', 群馬県: '高崎市', 埼玉県: 'さいたま市', 千葉県: '船橋市', 東京都: '世田谷区', 神奈川県: '横浜市',
  新潟県: '新潟市', 富山県: '富山市', 石川県: '金沢市', 福井県: '福井市', 山梨県: '甲府市', 長野県: '松本市', 岐阜県: '岐阜市', 静岡県: '浜松市', 愛知県: '名古屋市',
  三重県: '津市', 滋賀県: '大津市', 京都府: '京都市', 大阪府: '堺市', 兵庫県: '神戸市', 奈良県: '奈良市', 和歌山県: '和歌山市',
  鳥取県: '米子市', 島根県: '松江市', 岡山県: '倉敷市', 広島県: '広島市', 山口県: '下関市', 徳島県: '徳島市', 香川県: '高松市', 愛媛県: '松山市', 高知県: '高知市',
  福岡県: '北九州市', 佐賀県: '佐賀市', 長崎県: '佐世保市', 熊本県: '熊本市', 大分県: '別府市', 宮崎県: '宮崎市', 鹿児島県: '鹿児島市', 沖縄県: '那覇市',
};

export const regionOf = (pref: string): Region | undefined =>
  REGIONS.find((r) => PREFS[r].includes(pref));

export interface Parcel { pref: string; address: string; region: Region; label: string }

const GOODS = ['衣類', '食品', '本', '家電', 'くつ', '日用品', 'おもちゃ', '化粧品'];

export function makeParcel(rng: Rng): Parcel {
  const region = pick(rng, REGIONS);
  const pref = pick(rng, PREFS[region]);
  const address = `${pref}${CITIES[pref]} ${1 + randInt(rng, 9)}-${1 + randInt(rng, 20)}-${1 + randInt(rng, 30)}`;
  return { pref, address, region, label: pick(rng, GOODS) };
}

// ---------- ハンバーガー屋 ----------

export const TOPPINGS = ['パティ', 'チーズ', 'レタス', 'トマト', 'ピクルス', 'オニオン', 'ベーコン', 'たまご'] as const;
export type Topping = (typeof TOPPINGS)[number];

export const MENU: { name: string; layers: Topping[] }[] = [
  { name: 'ハンバーガー', layers: ['パティ', 'ピクルス', 'オニオン'] },
  { name: 'チーズバーガー', layers: ['パティ', 'チーズ', 'ピクルス', 'オニオン'] },
  { name: 'ダブルチーズバーガー', layers: ['パティ', 'チーズ', 'パティ', 'チーズ', 'ピクルス'] },
  { name: 'BLTバーガー', layers: ['ベーコン', 'レタス', 'トマト'] },
  { name: '月見バーガー', layers: ['パティ', 'たまご', 'ベーコン', 'チーズ'] },
  { name: 'てりやきバーガー', layers: ['パティ', 'レタス'] },
];

export interface Order { name: string; layers: Topping[]; note?: string }

/** 注文。ときどき「〇〇抜き」の注文が入る */
export function makeOrder(rng: Rng): Order {
  const m = pick(rng, MENU);
  if (m.layers.length > 2 && rng() < 0.3) {
    const optional = m.layers.filter((l) => l !== 'パティ');
    const drop = pick(rng, optional);
    return { name: m.name, layers: m.layers.filter((l) => l !== drop), note: `${drop}抜き` };
  }
  return { name: m.name, layers: [...m.layers] };
}

export const sameStack = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

// ---------- 交通量調査 ----------

export const VEHICLES = ['乗用車', 'トラック', 'バス', 'バイク', '自転車'] as const;
export type Vehicle = (typeof VEHICLES)[number];

export interface Pass { at: number; type: Vehicle; /** 画面を横切る秒数 */ dur: number; dir: 1 | -1 }

/** seconds 秒のあいだに通る車の予定（乗用車が多め） */
export function makeTraffic(rng: Rng, seconds: number): Pass[] {
  const weights: [Vehicle, number][] = [['乗用車', 50], ['トラック', 15], ['バス', 6], ['バイク', 15], ['自転車', 14]];
  const totalW = weights.reduce((s, [, w]) => s + w, 0);
  const out: Pass[] = [];
  let t = 1;
  while (t < seconds - 3) {
    let r = rng() * totalW;
    let type: Vehicle = '乗用車';
    for (const [v, w] of weights) {
      if ((r -= w) < 0) { type = v; break; }
    }
    const dur = type === '自転車' ? 4 : type === 'バス' || type === 'トラック' ? 3 : 2.2;
    out.push({ at: t, type, dur, dir: rng() < 0.5 ? 1 : -1 });
    t += 0.6 + rng() * 1.4;
  }
  return out;
}

/** 数えた結果の採点：ok = 合っていた台数、miss = ずれた台数 */
export function scoreCount(actual: Record<string, number>, counted: Record<string, number>) {
  let ok = 0;
  let miss = 0;
  for (const v of VEHICLES) {
    const a = actual[v] ?? 0;
    const c = counted[v] ?? 0;
    ok += Math.min(a, c);
    miss += Math.abs(a - c);
  }
  return { ok, miss };
}

export function tally(passes: Pass[]): Record<Vehicle, number> {
  const out = Object.fromEntries(VEHICLES.map((v) => [v, 0])) as Record<Vehicle, number>;
  for (const p of passes) out[p.type]++;
  return out;
}
