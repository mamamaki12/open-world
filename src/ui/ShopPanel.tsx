// プレイヤーのお店（レジの前で開く）。持ち主は店を開いて商品を自由に登録、ほかのプレイヤーは一回払いで買う。
import { useState } from 'react';
import { Modal } from './Modal';
import { useGame } from '../state/store';
import { useEconomy } from '../state/economy';
import { useVehicles } from '../state/vehicles';
import { useSession } from '../session/session';
import { sessionGate } from '../session/gate';
import { savedBundle } from '../session/saves';
import { cleanPromo, cleanShop, newShop, passesOf, removeItem, upsertItem, ITEM_KINDS, RESERVE_AHEAD, SHOP_LIMITS } from '../economy/shop';
import type { ItemKind, Shop, ShopItem, ShopSale } from '../economy/shop';
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

const kindName = (k?: ItemKind) => ITEM_KINDS.find((x) => x.id === (k ?? 'goods'))!.name;
/** 券の有効期限など、種類ごとの一言 */
const passNote = (s: ShopSale) => s.kind === 'membership' ? `${s.until}日目まで有効` : s.kind === 'reservation' ? `${s.forDay}日目の予約` : s.kind === 'ticket' ? '入場券' : '';
const blank = (): ShopItem => ({ id: crypto.randomUUID(), name: '', price: 1000, description: '' });

export function ShopPanel() {
  const close = useGame((s) => s.setOverlay);
  // 開いたときのレジの店を見続ける（パネルを開いている間に目の前の対象が変わっても消えない）
  const [lotId] = useState(() => { const t = useVehicles.getState().target; return t?.startsWith('register:') ? t.slice(9) : null; });
  const lot = useEconomy((s) => s.lots.find((l) => l.id === lotId));
  const money = useEconomy((s) => s.money);
  const today = useEconomy((s) => s.day);
  const [reserveDay, setReserveDay] = useState<Record<string, number>>({});
  const role = useSession((s) => s.role);
  const [tab, setTab] = useState<'items' | 'sales' | 'promo'>('items');
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
    setError((sessionGate.act ? sessionGate.act(lot.id, { type: 'purchase', item: i.id, price: i.price, ...(i.kind === 'reservation' ? { day: reserveDay[i.id] ?? today } : {}) }, i.price) : '接続していません') ?? '');
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

  return <Modal className="shop-panel" title={shop.name} onClose={onClose} tabs={[{ id: 'items', label: '商品' }, { id: 'sales', label: '売上' }, ...(owner ? [{ id: 'promo' as const, label: '宣伝' }] : [])]} tab={tab} onTab={setTab}>
    {tab === 'promo' && owner ? <Promo shop={shop} today={today} onSave={(next) => { save(next); setError(''); useGame.getState().notify('📣 宣伝を更新しました'); }} />
    : tab === 'sales' ? <>
      <p>売上合計 <b className="big">{yen(shop.revenue)}</b>（{shop.sales.length}件・誰でも見られます）</p>
      <ul className="shop-sales">{[...shop.sales].reverse().map((s) => <li key={s.id}>{s.day}日目 · {s.buyer}さん · {s.item} · {yen(s.price)}{s.kind ? ` · ${passNote(s)}` : ''}</li>)}</ul>
      {!shop.sales.length && <p>まだ売れていません。</p>}
    </> : <>
      {owner && <p className="shop-note">みんなのワールドで、ほかのプレイヤーが一回払いで買えます。代金はそのままあなたの所持金に入ります。</p>}
      {!owner && <p>所持金 {yen(money)}</p>}
      {!owner && shared && (() => { const mine = passesOf(shop, savedBundle().profile.id, today); return mine.length ? <div className="card shop-passes"><b>あなたの券</b>{mine.map((p) => <div key={p.id}>🎫 {p.item} · {passNote(p)}</div>)}</div> : null; })()}
      <div className="shop-items">
        {shop.items.map((i) => <div key={i.id} className="shop-item card">
          {i.photo ? <img src={i.photo} alt="" /> : <div className="shop-photo-empty">写真なし</div>}
          {i.kind && <span className="shop-kind">{kindName(i.kind)}{i.kind === 'membership' ? `・${i.days}日間` : ''}</span>}
          <b>{i.name}</b><span className="big">{yen(i.price)}</span>
          {!owner && i.kind === 'reservation' && <label className="shop-note">予約する日 <select value={reserveDay[i.id] ?? today} onChange={(e) => setReserveDay({ ...reserveDay, [i.id]: Number(e.target.value) })}>
            {Array.from({ length: RESERVE_AHEAD + 1 }, (_, d) => today + d).map((d) => <option key={d} value={d}>{d}日目{d === today ? '（今日）' : ''}</option>)}
          </select></label>}
          {i.description && <p>{i.description}</p>}
          {owner ? <div><button className="btn small" onClick={() => { setDraft(i); setError(''); }}>編集</button><button className="btn small danger" onClick={() => save(removeItem(shop, i.id))}>取り下げ</button></div>
            : <button className="btn primary" disabled={money < i.price} onClick={() => buy(i)}>買う</button>}
        </div>)}
      </div>
      {!shop.items.length && <p>{owner ? 'まだ商品がありません。' : '準備中です。'}</p>}
      {error && <p className="warn" role="alert">{error}</p>}
      {owner && (draft ? <div className="card shop-form">
        <div className="field"><div className="field-label">商品・サービスの名前</div><input type="text" maxLength={SHOP_LIMITS.itemName} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
        <div className="field"><div className="field-label">種類</div>
          <select value={draft.kind ?? 'goods'} onChange={(e) => setDraft({ ...draft, kind: e.target.value as ItemKind, days: draft.days ?? 30 })}>
            {ITEM_KINDS.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          {draft.kind === 'membership' && <label className="shop-note"> 有効日数 <input type="text" inputMode="numeric" style={{ width: 60 }} value={draft.days ?? 30} onChange={(e) => setDraft({ ...draft, days: Number(e.target.value.replace(/[^0-9]/g, '')) })} /> 日（1〜365）</label>}
        </div>
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

/** 持ち主の宣伝：看板の文字・チラシ・地図のピン・イベント告知 */
function Promo({ shop, today, onSave }: { shop: Shop; today: number; onSave: (s: Shop) => void }) {
  const [p, setP] = useState(() => ({ sign: shop.sign ?? '', flyer: shop.flyer ?? '', pin: !!shop.pin, title: shop.event?.title ?? '', day: shop.event?.day ?? today, note: shop.event?.note ?? '', arcadeFee: shop.arcadeFee ?? 0 }));
  const promo = cleanPromo({ sign: p.sign, flyer: p.flyer, pin: p.pin, event: { title: p.title, day: p.day, note: p.note } });
  return <div className="shop-form">
    <div className="field"><div className="field-label">看板の文字（土地の前の看板）</div><input type="text" maxLength={SHOP_LIMITS.sign} value={p.sign} placeholder={shop.name} onChange={(e) => setP({ ...p, sign: e.target.value })} /></div>
    <div className="field"><div className="field-label">チラシ（地図の「お店・イベント」に出ます）</div><textarea maxLength={SHOP_LIMITS.flyer} value={p.flyer} placeholder="例：家の設計、1軒30万円から。見学だけでもどうぞ" onChange={(e) => setP({ ...p, flyer: e.target.value })} /></div>
    <label className="field"><input type="checkbox" checked={p.pin} onChange={(e) => setP({ ...p, pin: e.target.checked })} /> 地図にピンを立てる</label>
    <div className="field"><div className="field-label">イベント告知（名前を空にすると告知しません）</div>
      <input type="text" maxLength={SHOP_LIMITS.eventTitle} value={p.title} placeholder="例：オープン記念セール" onChange={(e) => setP({ ...p, title: e.target.value })} />
      <label className="shop-note">開く日 <select value={p.day} onChange={(e) => setP({ ...p, day: Number(e.target.value) })}>
        {Array.from({ length: RESERVE_AHEAD + 1 }, (_, d) => today + d).map((d) => <option key={d} value={d}>{d}日目{d === today ? '（今日）' : ''}</option>)}
      </select></label>
      <textarea maxLength={SHOP_LIMITS.eventNote} value={p.note} placeholder="内容（例：全品半額、夜8時から）" onChange={(e) => setP({ ...p, note: e.target.value })} />
    </div>
    <div className="field"><div className="field-label">ゲーム機の料金（1回・0円なら無料）</div><input type="text" inputMode="numeric" value={p.arcadeFee} onChange={(e) => setP({ ...p, arcadeFee: Number(e.target.value.replace(/[^0-9]/g, '')) })} />
      <p className="shop-note">家具の「ゲーム機（アーケード）」を1階に置くと、お客さんがモグラたたきで遊べます。料金はあなたの所持金に入ります。</p></div>
    <button className="btn primary" onClick={() => onSave({ ...shop, sign: undefined, flyer: undefined, pin: undefined, event: undefined, ...promo, arcadeFee: p.arcadeFee > 0 ? p.arcadeFee : undefined })}>宣伝を保存</button>
  </div>;
}
