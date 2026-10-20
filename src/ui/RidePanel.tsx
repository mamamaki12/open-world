// お店のコイン式の乗り物。料金は遊んだ人から店の持ち主へ（みんなのワールド）。持ち主とひとりのときは無料
import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useGame } from '../state/store';
import { useEconomy } from '../state/economy';
import { useVehicles } from '../state/vehicles';
import { useSession } from '../session/session';
import { sessionGate } from '../session/gate';
import { savedBundle } from '../session/saves';
import { cleanShop } from '../economy/shop';
import { yen } from '../economy/money';
import './shop.css';

const SECONDS = 10;

export function RidePanel() {
  const close = useGame((s) => s.setOverlay);
  const [lotId] = useState(() => { const t = useVehicles.getState().target; return t?.startsWith('ride:') ? t.slice(5) : null; });
  const lot = useEconomy((s) => s.lots.find((l) => l.id === lotId));
  const money = useEconomy((s) => s.money);
  const shared = useSession((s) => s.shared) && sessionGate.shared;
  const owner = !shared || lot?.owner === savedBundle().profile.id;
  const shop = cleanShop(lot?.shop);
  const fee = owner ? 0 : shop?.rideFee ?? 0;
  const [endAt, setEndAt] = useState(0);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState('');
  const playing = left > 0;

  useEffect(() => {
    if (!endAt) return;
    const tick = setInterval(() => setLeft(Math.max(0, (endAt - performance.now()) / 1000)), 200);
    return () => clearInterval(tick);
  }, [endAt]);

  const start = () => {
    if (fee) {
      const err = sessionGate.act ? sessionGate.act(lot!.id, { type: 'play', fee, kind: 'ride' }, fee) : '接続していません';
      if (err) { setError(err); return; }
    }
    setError(''); setLeft(SECONDS); setEndAt(performance.now() + SECONDS * 1000);
  };

  return <Modal title={`🚗 ${shop?.name ?? 'お店'}のコイン式の乗り物`} onClose={() => close(null)} tabs={[]} tab="" onTab={() => undefined} className="shop-panel">
    {!lot ? <p>乗り物の前で開いてください。</p> : <>
      <p className="shop-note">{SECONDS}秒間、コインを入れて乗り物を動かします。{fee ? `1回 ${yen(fee)}（お店に払います）` : owner && shared ? '自分のお店なので無料です。' : '無料'}</p>
      <div className="ride-stage">
        <div className={`ride-car${playing ? ' playing' : ''}`}>🚗</div>
        <div className="ride-timer">{playing ? `残り ${Math.ceil(left)} 秒` : 'コインを入れてください'}</div>
      </div>
      {error && <p className="warn" role="alert">{error}</p>}
      {!playing && <button className="btn primary" disabled={money < fee} onClick={start}>{fee ? `${yen(fee)} で乗る` : '乗る'}</button>}
    </>}
  </Modal>;
}
