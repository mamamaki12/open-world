// プレイヤーが開くお店。業種は持たず、名前・写真・値段・説明だけで何でも売れる。
// 描画やブラウザーの状態に依存しない（共有ワールドのサーバーでも使えるように）。

/** 売り物の種類。goods は物・サービス（一回きり）、ticket は入場券、reservation は日を決めて予約、membership は期限つきの会員権 */
export type ItemKind = 'goods' | 'ticket' | 'reservation' | 'membership';
export const ITEM_KINDS: { id: ItemKind; name: string }[] = [
  { id: 'goods', name: '物・サービス' }, { id: 'ticket', name: '入場券' }, { id: 'reservation', name: '予約' }, { id: 'membership', name: '会員権' },
];
/** 予約できるのは今日から何日先まで */
export const RESERVE_AHEAD = 30;

export interface ShopItem {
  id: string;
  kind?: ItemKind;
  /** 会員権の有効日数 */
  days?: number;
  name: string;
  /** 一回払いの値段（円） */
  price: number;
  description: string;
  /** その場のスクショ（data:image/jpeg） */
  photo?: string;
}

export interface ShopSale {
  id: string;
  day: number;
  buyer: string;
  item: string;
  price: number;
  kind?: ItemKind;
  /** 買った人のID（券を見せるときに使う） */
  buyerId?: string;
  /** 会員権の最終日 */
  until?: number;
  /** 予約した日 */
  forDay?: number;
}

export interface Shop {
  name: string;
  items: ShopItem[];
  /** 直近の売上（誰でも見られる） */
  sales: ShopSale[];
  revenue: number;
  /** 土地の前の看板に出す文字（空なら店の名前） */
  sign?: string;
  /** チラシの文。地図の「お店・イベント」に出る */
  flyer?: string;
  /** 地図にピンを立てる */
  pin?: boolean;
  /** イベント告知（day は何日目か） */
  event?: ShopEvent;
  /** 店に置いたゲーム機の1回の料金（なければ無料） */
  arcadeFee?: number;
}

export interface ShopEvent { title: string; day: number; note: string }

export const SHOP_LIMITS = { items: 12, name: 24, itemName: 30, description: 200, photo: 60_000, sales: 100, price: 10_000_000_000, sign: 16, flyer: 120, eventTitle: 30, eventNote: 120 };

const kindOf = (v: unknown): ItemKind => (ITEM_KINDS.some(k => k.id === v) ? (v as ItemKind) : 'goods');
const daysOf = (v: unknown) => (Number.isSafeInteger(v) && (v as number) >= 1 && (v as number) <= 365 ? (v as number) : 30);
/** 種類と日数を正しい形にそろえる（物・サービスは何も付けない） */
function typed(i: { kind?: unknown; days?: unknown }): Pick<ShopItem, 'kind' | 'days'> {
  const kind = kindOf(i.kind);
  return kind === 'goods' ? {} : kind === 'membership' ? { kind, days: daysOf(i.days) } : { kind };
}
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const photo = (v: unknown) =>
  typeof v === 'string' && v.length <= SHOP_LIMITS.photo && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v) ? v : undefined;

/** 値段として正しければ null、だめなら理由 */
export function priceError(price: number): string | null {
  if (!Number.isSafeInteger(price) || price < 1) return '値段は1円以上の整数にしてください';
  if (price > SHOP_LIMITS.price) return '値段が高すぎます（100億円まで）';
  return null;
}

/** 保存や通信で届いた店のデータを、表示しても安全な形に直す。店でなければ null */
export function cleanShop(v: unknown): Shop | null {
  if (!v || typeof v !== 'object') return null;
  const s = v as Partial<Shop>;
  const items = (Array.isArray(s.items) ? s.items : []).slice(0, SHOP_LIMITS.items).flatMap((i): ShopItem[] => {
    if (!i || typeof i !== 'object' || typeof i.id !== 'string' || i.id.length > 80) return [];
    const name = str(i.name, SHOP_LIMITS.itemName);
    if (!name || priceError(i.price)) return [];
    const p = photo(i.photo);
    return [{ id: i.id, name, price: i.price, description: str(i.description, SHOP_LIMITS.description), ...typed(i), ...(p ? { photo: p } : {}) }];
  });
  const sales = (Array.isArray(s.sales) ? s.sales : []).slice(-SHOP_LIMITS.sales).flatMap((x): ShopSale[] =>
    x && typeof x.id === 'string' && Number.isFinite(x.day) && Number.isSafeInteger(x.price)
      ? [{ id: x.id, day: x.day, buyer: str(x.buyer, 24), item: str(x.item, SHOP_LIMITS.itemName), price: x.price,
        ...(x.kind && x.kind !== 'goods' ? { kind: kindOf(x.kind) } : {}),
        ...(typeof x.buyerId === 'string' && x.buyerId.length <= 100 ? { buyerId: x.buyerId } : {}),
        ...(Number.isSafeInteger(x.until) ? { until: x.until } : {}), ...(Number.isSafeInteger(x.forDay) ? { forDay: x.forDay } : {}) }]
      : [],
  );
  return { name: str(s.name, SHOP_LIMITS.name) || 'お店', items, sales, revenue: Number.isSafeInteger(s.revenue) ? s.revenue! : 0, ...cleanPromo(s),
    ...(!priceError(s.arcadeFee as number) ? { arcadeFee: s.arcadeFee } : {}) };
}

/** 看板・チラシ・ピン・イベントを正しい形にそろえる（空のものは付けない） */
export function cleanPromo(s: { sign?: unknown; flyer?: unknown; pin?: unknown; event?: unknown }): Pick<Shop, 'sign' | 'flyer' | 'pin' | 'event'> {
  const sign = str(s.sign, SHOP_LIMITS.sign), flyer = str(s.flyer, SHOP_LIMITS.flyer);
  const e = s.event && typeof s.event === 'object' ? (s.event as Partial<ShopEvent>) : null;
  const title = e ? str(e.title, SHOP_LIMITS.eventTitle) : '';
  return { ...(sign ? { sign } : {}), ...(flyer ? { flyer } : {}), ...(s.pin === true ? { pin: true } : {}),
    ...(e && title && Number.isSafeInteger(e.day) && e.day! >= 0 ? { event: { title, day: e.day!, note: str(e.note, SHOP_LIMITS.eventNote) } } : {}) };
}

/** 地図に出す店（ピンありか、これからのイベントがある）。イベントの近い順、次に名前順 */
export function listedShops<T extends { shop?: Shop }>(lots: T[], today: number): (T & { shop: Shop })[] {
  const soon = (l: { shop: Shop }) => (l.shop.event && l.shop.event.day >= today ? l.shop.event.day : Infinity);
  return lots.filter((l): l is T & { shop: Shop } => !!l.shop && (!!l.shop.pin || soon(l as T & { shop: Shop }) < Infinity))
    .sort((a, b) => soon(a) - soon(b) || a.shop.name.localeCompare(b.shop.name));
}

export function newShop(name: string): Shop {
  return { name: str(name, SHOP_LIMITS.name) || 'お店', items: [], sales: [], revenue: 0 };
}

/** 商品を追加・上書きする。だめなら理由を返す */
export function upsertItem(shop: Shop, item: ShopItem): Shop | string {
  const name = str(item.name, SHOP_LIMITS.itemName);
  if (!name) return '商品名を入れてください';
  const err = priceError(item.price);
  if (err) return err;
  const exists = shop.items.some((i) => i.id === item.id);
  if (!exists && shop.items.length >= SHOP_LIMITS.items) return `商品は${SHOP_LIMITS.items}個までです`;
  const p = photo(item.photo);
  const clean: ShopItem = { id: item.id, name, price: item.price, description: str(item.description, SHOP_LIMITS.description), ...typed(item), ...(p ? { photo: p } : {}) };
  return { ...shop, items: exists ? shop.items.map((i) => (i.id === item.id ? clean : i)) : [...shop.items, clean] };
}

export function removeItem(shop: Shop, id: string): Shop {
  return { ...shop, items: shop.items.filter((i) => i.id !== id) };
}

/**
 * 一回払いの購入を店に記録する。値段が変わっていたり商品が消えていたら理由を返す。
 * お金の移動（買い手から払い、持ち主が受け取る）は呼び出し側で行う。
 */
export function recordSale(shop: Shop, sale: { id: string; day: number; buyer: string; buyerId?: string; itemId: string; price: number; forDay?: number }): { shop: Shop; item: ShopItem } | string {
  const item = shop.items.find((i) => i.id === sale.itemId);
  if (!item) return 'この商品は売り切れか、取り下げられました';
  if (item.price !== sale.price) return '値段が変わりました。もう一度確認してください';
  const kind = kindOf(item.kind);
  if (kind === 'reservation' && !(Number.isSafeInteger(sale.forDay) && sale.forDay! >= sale.day && sale.forDay! <= sale.day + RESERVE_AHEAD)) return `予約する日を今日から${RESERVE_AHEAD}日以内で選んでください`;
  const entry: ShopSale = { id: sale.id, day: sale.day, buyer: str(sale.buyer, 24) || 'お客さん', item: item.name, price: item.price,
    ...(kind !== 'goods' ? { kind } : {}), ...(sale.buyerId ? { buyerId: sale.buyerId } : {}),
    ...(kind === 'membership' ? { until: sale.day + daysOf(item.days) - 1 } : {}), ...(kind === 'reservation' ? { forDay: sale.forDay } : {}) };
  return { item, shop: { ...shop, sales: [...shop.sales, entry].slice(-SHOP_LIMITS.sales), revenue: shop.revenue + item.price } };
}

/** その人が持っている、まだ使える券（入場券・予約・有効な会員権） */
export function passesOf(shop: Shop, buyerId: string, today: number): ShopSale[] {
  return shop.sales.filter((s) => s.buyerId === buyerId && s.kind && s.kind !== 'goods' &&
    (s.kind === 'membership' ? (s.until ?? -1) >= today : s.kind === 'reservation' ? (s.forDay ?? -1) >= today : true));
}

export const ARCADE_PLAY = 'ゲーム機で1回遊ぶ';

/** ゲーム機の料金を店の売上に記録する。料金が変わっていたら理由を返す（お金の移動は呼び出し側） */
export function recordPlay(shop: Shop, play: { id: string; day: number; buyer: string; buyerId?: string; fee: number }): Shop | string {
  if (!shop.arcadeFee) return 'このお店のゲーム機は無料です';
  if (shop.arcadeFee !== play.fee) return '料金が変わりました。もう一度確認してください';
  const entry: ShopSale = { id: play.id, day: play.day, buyer: str(play.buyer, 24) || 'お客さん', item: ARCADE_PLAY, price: play.fee, ...(play.buyerId ? { buyerId: play.buyerId } : {}) };
  return { ...shop, sales: [...shop.sales, entry].slice(-SHOP_LIMITS.sales), revenue: shop.revenue + play.fee };
}
