// 仕事の依頼板：プレイヤーが報酬を預けて仕事を頼む・人を雇う。引き受けた人は、依頼主が完了を確認すると報酬を受け取る
import './shop.css';
import { useState } from 'react';
import { Modal } from './Modal';
import { useGame } from '../state/store';
import { useEconomy } from '../state/economy';
import { useSession } from '../session/session';
import { sessionGate } from '../session/gate';
import { savedBundle } from '../session/saves';
import { warpToLot } from '../world/Player';
import { REQUEST_LIMITS, cleanRequests, requestError } from '../economy/requests';
import type { RequestOp } from '../economy/requests';
import { yen } from '../economy/money';

export function RequestsPanel() {
  const close = useGame((s) => s.setOverlay);
  const lots = useEconomy((s) => s.lots);
  const money = useEconomy((s) => s.money);
  const shared = useSession((s) => s.shared) && sessionGate.shared;
  const me = savedBundle().profile.id;
  const mine = lots.filter((l) => l.owner === me && !l.listing);
  const [draft, setDraft] = useState({ lot: '', title: '', description: '', reward: 10000 });
  const [error, setError] = useState('');
  const all = lots.flatMap((l) => cleanRequests(l.requests).map((r) => ({ r, lot: l })));
  const act = (lotId: string, action: Parameters<NonNullable<typeof sessionGate.act>>[1], reserved = 0) =>
    setError((sessionGate.act ? sessionGate.act(lotId, action, reserved) : '接続していません') ?? '');
  const step = (lotId: string, request: string, op: RequestOp) => act(lotId, { type: 'requestStep', request, op });
  const post = () => {
    const lotId = draft.lot || mine[0]?.id;
    const err = !lotId ? '依頼を出すには自分の土地が必要です' : requestError(draft) ?? (money < draft.reward ? 'お金が足りません' : null);
    if (err) { setError(err); return; }
    act(lotId!, { type: 'request', title: draft.title, description: draft.description, reward: draft.reward }, draft.reward);
    setDraft({ ...draft, title: '', description: '' });
  };

  return <Modal title="🤝 仕事の依頼" onClose={() => close(null)} tabs={[]} tab="" onTab={() => undefined} className="shop-panel">
    {!shared ? <p>みんなのワールドで、ほかのプレイヤーに仕事を頼んだり、引き受けたりできます。</p> : <>
      <p className="shop-note">報酬は依頼したときに預かり、依頼した人が「完了」を押すと引き受けた人に渡ります。だれも引き受けていなければ取り下げて戻せます。</p>
      <div className="shop-items">
        {all.map(({ r, lot }) => <div key={r.id} className="shop-item card">
          <b>{r.title}</b><span className="big">{yen(r.reward)}</span>
          <span className="shop-note">{r.poster === me ? 'あなた' : r.posterName}さんの依頼 · {lot.name.replace(/（.*）$/, '')}{r.worker ? ` · ${r.worker === me ? 'あなた' : r.workerName}さんが引き受け中` : ' · 募集中'}</span>
          {r.description && <p>{r.description}</p>}
          <div>
            {r.poster !== me && !r.worker && <button className="btn primary" onClick={() => step(lot.id, r.id, 'take')}>引き受ける</button>}
            {r.worker === me && <button className="btn" onClick={() => step(lot.id, r.id, 'quit')}>やめる</button>}
            {r.poster === me && r.worker && <button className="btn primary" onClick={() => step(lot.id, r.id, 'done')}>完了（報酬を渡す）</button>}
            {r.poster === me && !r.worker && <button className="btn" onClick={() => step(lot.id, r.id, 'cancel')}>取り下げる</button>}
            <button className="btn small" onClick={() => warpToLot(lot.id)}>場所へ行く</button>
          </div>
        </div>)}
      </div>
      {!all.length && <p>いまは依頼がありません。</p>}
      {error && <p className="warn" role="alert">{error}</p>}
      <div className="card shop-form">
        <b>仕事を頼む・人を雇う</b>
        {mine.length > 1 && <div className="field"><div className="field-label">場所（自分の土地）</div><select value={draft.lot || mine[0].id} onChange={(e) => setDraft({ ...draft, lot: e.target.value })}>{mine.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>}
        <div className="field"><div className="field-label">依頼の名前</div><input type="text" maxLength={REQUEST_LIMITS.title} value={draft.title} placeholder="例：お店の店番（1日）" onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
        <div className="field"><div className="field-label">内容</div><textarea maxLength={REQUEST_LIMITS.description} value={draft.description} placeholder="例：夜8時から、レジの前でお客さんの案内" onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
        <div className="field"><div className="field-label">報酬（円・先に預けます）</div><input type="text" inputMode="numeric" value={draft.reward} onChange={(e) => setDraft({ ...draft, reward: Number(e.target.value.replace(/[^0-9]/g, '')) })} /></div>
        <button className="btn primary" disabled={!mine.length} onClick={post}>報酬を預けて依頼する</button>
        {!mine.length && <p className="shop-note">依頼を出すには、売りに出していない自分の土地が必要です。</p>}
      </div>
    </>}
  </Modal>;
}
