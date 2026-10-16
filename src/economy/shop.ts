// プレイヤーが開くお店。業種は持たず、名前・写真・値段・説明だけで何でも売れる。
// 描画やブラウザーの状態に依存しない（共有ワールドのサーバーでも使えるように）。

export interface ShopItem {
  id: string;
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
}

export interface Shop {
  name: string;
  items: ShopItem[];
  /** 直近の売上（誰でも見られる） */
  sales: ShopSale[];
  revenue: number;
}

export const SHOP_LIMITS = { items: 12, name: 24, itemName: 30, description: 200, photo: 60_000, sales: 50, price: 10_000_000_000 };

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
    return [{ id: i.id, name, price: i.price, description: str(i.description, SHOP_LIMITS.description), ...(p ? { photo: p } : {}) }];
  });
  const sales = (Array.isArray(s.sales) ? s.sales : []).slice(-SHOP_LIMITS.sales).flatMap((x): ShopSale[] =>
    x && typeof x.id === 'string' && Number.isFinite(x.day) && Number.isSafeInteger(x.price)
      ? [{ id: x.id, day: x.day, buyer: str(x.buyer, 24), item: str(x.item, SHOP_LIMITS.itemName), price: x.price }]
      : [],
  );
  return { name: str(s.name, SHOP_LIMITS.name) || 'お店', items, sales, revenue: Number.isSafeInteger(s.revenue) ? s.revenue! : 0 };
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
  const clean: ShopItem = { id: item.id, name, price: item.price, description: str(item.description, SHOP_LIMITS.description), ...(p ? { photo: p } : {}) };
  return { ...shop, items: exists ? shop.items.map((i) => (i.id === item.id ? clean : i)) : [...shop.items, clean] };
}

export function removeItem(shop: Shop, id: string): Shop {
  return { ...shop, items: shop.items.filter((i) => i.id !== id) };
}

/**
 * 一回払いの購入を店に記録する。値段が変わっていたり商品が消えていたら理由を返す。
 * お金の移動（買い手から払い、持ち主が受け取る）は呼び出し側で行う。
 */
export function recordSale(shop: Shop, sale: { id: string; day: number; buyer: string; itemId: string; price: number }): { shop: Shop; item: ShopItem } | string {
  const item = shop.items.find((i) => i.id === sale.itemId);
  if (!item) return 'この商品は売り切れか、取り下げられました';
  if (item.price !== sale.price) return '値段が変わりました。もう一度確認してください';
  const entry: ShopSale = { id: sale.id, day: sale.day, buyer: str(sale.buyer, 24) || 'お客さん', item: item.name, price: item.price };
  return { item, shop: { ...shop, sales: [...shop.sales, entry].slice(-SHOP_LIMITS.sales), revenue: shop.revenue + item.price } };
}
