// プレイヤーのお店（レジの前で開く）。持ち主は店を開いて商品を自由に登録、ほかのプレイヤーは一回払いで買う。
import { useState } from 'react';
import { Modal } from './Modal';
import { useGame } from '../state/store';
import { useEconomy } from '../state/economy';
import { useVehicles } from '../state/vehicles';
import { useSession } from '../session/session';
import { sessionGate } from '../session/gate';
import { savedBundle } from '../session/saves';
import { cleanShop, newShop, removeItem, upsertItem, SHOP_LIMITS } from '../economy/shop';
import type { Shop, ShopItem } from '../economy/shop';
import { yen } from '../economy/money';
import './shop.css';

/** 3D画面のいまの景色を小さなJPEGにする（パネルの裏の景色が写る） */
function snapPhoto(): string | undefined {
  const canvases = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height);
  const src = canvases[0];
  if (!src || !src.width) return undefined;
  const out = document.createElement('canvas');
  out.width = 320; out.height = Math.round((320 * src.height) / src.width);
  out.getContext('2d')?.drawImage(src, 0, 0, out.width, out.height);
  for (const q of [0.7, 0.5, 0.35]) { const url = out.toDataURL('image/jpeg', q); if (url.length <= SHOP_LIMITS.photo) return url; }
  return undefined;
}

const blank = (): ShopItem => ({ id: crypto.randomUUID(), name: '', price: 1000, description: '' });

export function ShopPanel() {
  const close = useGame((s) => s.setOverlay);
  const target = useVehicles((s) => s.target);
  const lotId = target?.startsWith('register:') ? target.slice(9) : null;
  const lot = useEconomy((s) => s.lots.find((l) => l.id === lotId));
  const money = useEconomy((s) => s.money);
  const role = useSession((s) => s.role);
  const [tab, setTab] = useState<'items' | 'sales'>('items');
  const [draft, setDraft] = useState<ShopItem | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  // みんなのワールドでは持ち主だけが店を開き、ほかの人が買う（お金はサーバーが持ち主へ直接移す）
  const shared = useSession((s) => s.shared) && sessionGate.shared;
  const owner = shared ? lot?.owner === savedBundle().profile.id : role !== 'guest';
  const shop = cleanShop(lot?.shop);
  const save = (next: Shop | null) => {
    if (!lot) return;
    if (!shared) { useEconomy.getState().setShop(lot.id, next); return; }
    const err = sessionGate.act ? sessionGate.act(lot.id, { type: 'shop', shop: next }, 0) : '接続していません';
    if (err) setError(err);
  };
  const buy = (i: ShopItem) => {
    if (!lot) return;
    if (!shared) { setError('みんなのワールドで、ほかのプレイヤーのお店から買えます'); return; }
    setError((sessionGate.act ? sessionGate.act(lot.id, { type: 'purchase', item: i.id, price: i.price }, i.price) : '接続していません') ?? '');
  };
  const onClose = () => close(null);

  if (!lot) return <Modal title="お店" onClose={onClose} tabs={[]} tab="" onTab={() => undefined}><p>レジの前で開いてください。</p></Modal>;

  if (!shop) return <Modal title="お店を開く" onClose={onClose} tabs={[]} tab="" onTab={() => undefined}>
    {owner ? <>
      <p>この建物をお店にします。業種は決まっていません。売りたい物やサービスを自由に登録してください（家・車・服・手作り家具・入場券・設計代行など何でも）。</p>
      <div className="field"><div className="field-label">お店の名前</div><input type="text" maxLength={SHOP_LIMITS.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="例：しんご設計事務所" /></div>
      <button className="btn primary big-btn" disabled={!name.trim()} onClick={() => save(newShop(name))}>お店を開く</button>
    </> : <p>このレジのお店はまだ準備中です。</p>}
  </Modal>;

  const editItem = (item: ShopItem) => {
    const next = upsertItem(shop, item);
    if (typeof next === 'string') { setError(next); return; }
    save(next); setDraft(null); setError('');
  };

  return <Modal className="shop-panel" title={shop.name} onClose={onClose} tabs={[{ id: 'items', label: '商品' }, { id: 'sales', label: '売上' }]} tab={tab} onTab={setTab}>
    {tab === 'sales' ? <>
      <p>売上合計 <b className="big">{yen(shop.revenue)}</b>（{shop.sales.length}件・誰でも見られます）</p>
      <ul className="shop-sales">{[...shop.sales].reverse().map((s) => <li key={s.id}>{s.day}日目 · {s.buyer}さん · {s.item} · {yen(s.price)}</li>)}</ul>
      {!shop.sales.length && <p>まだ売れていません。</p>}
    </> : <>
      {owner && <p className="shop-note">みんなのワールドで、ほかのプレイヤーが一回払いで買えます。代金はそのままあなたの所持金に入ります。</p>}
      {!owner && <p>所持金 {yen(money)}</p>}
      <div className="shop-items">
        {shop.items.map((i) => <div key={i.id} className="shop-item card">
          {i.photo ? <img src={i.photo} alt="" /> : <div className="shop-photo-empty">写真なし</div>}
          <b>{i.name}</b><span className="big">{yen(i.price)}</span>
          {i.description && <p>{i.description}</p>}
          {owner ? <div><button className="btn small" onClick={() => { setDraft(i); setError(''); }}>編集</button><button className="btn small danger" onClick={() => save(removeItem(shop, i.id))}>取り下げ</button></div>
            : <button className="btn primary" disabled={money < i.price} onClick={() => buy(i)}>買う</button>}
        </div>)}
      </div>
      {!shop.items.length && <p>{owner ? 'まだ商品がありません。' : '準備中です。'}</p>}
      {error && <p className="warn" role="alert">{error}</p>}
      {owner && (draft ? <div className="card shop-form">
        <div className="field"><div className="field-label">商品・サービスの名前</div><input type="text" maxLength={SHOP_LIMITS.itemName} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
        <div className="field"><div className="field-label">値段（円・一回払い）</div><input type="text" inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value.replace(/[^0-9]/g, '')) })} /></div>
        <div className="field"><div className="field-label">説明</div><textarea maxLength={SHOP_LIMITS.description} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
        <div className="field"><div className="field-label">写真</div>
          {draft.photo && <img className="shop-preview" src={draft.photo} alt="" />}
          <button className="btn" onClick={() => setDraft({ ...draft, photo: snapPhoto() })}>📷 いまの景色を写す</button>
          <p className="shop-note">パネルの裏に見えている景色が写ります。見せたい物の方を向いてからレジを開いてください。</p>
        </div>
        <button className="btn primary" onClick={() => editItem(draft)}>保存</button><button className="btn" onClick={() => setDraft(null)}>やめる</button>
      </div> : <>
        <button className="btn primary" disabled={shop.items.length >= SHOP_LIMITS.items} onClick={() => { setDraft(blank()); setError(''); }}>＋ 商品を追加</button>
        <button className="btn danger" onClick={() => { if (confirm('お店を閉じますか？商品と売上の記録は消えます')) save(null); }}>閉店する</button>
      </>)}
    </>}
  </Modal>;
}
