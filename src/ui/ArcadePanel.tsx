// お店のゲーム機（モグラたたき）。料金は遊んだ人から店の持ち主へ（みんなのワールド）。持ち主とひとりのときは無料
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

const SECONDS = 30, HOLES = 9;

export function ArcadePanel() {
  const close = useGame((s) => s.setOverlay);
  const [lotId] = useState(() => { const t = useVehicles.getState().target; return t?.startsWith('arcade:') ? t.slice(7) : null; });
  const lot = useEconomy((s) => s.lots.find((l) => l.id === lotId));
  const money = useEconomy((s) => s.money);
  const shared = useSession((s) => s.shared) && sessionGate.shared;
  const owner = !shared || lot?.owner === savedBundle().profile.id;
  const shop = cleanShop(lot?.shop);
  const fee = owner ? 0 : shop?.arcadeFee ?? 0;
  const [endAt, setEndAt] = useState(0);
  const [left, setLeft] = useState(0);
  const [mole, setMole] = useState(-1);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [error, setError] = useState('');
  const playing = left > 0;

  useEffect(() => {
    if (!endAt) return;
    const tick = setInterval(() => setLeft(Math.max(0, (endAt - performance.now()) / 1000)), 200);
    return () => clearInterval(tick);
  }, [endAt]);
  useEffect(() => {
    if (!playing) { setMole(-1); return; }
    // たたくほど早く出る
    const id = setTimeout(() => setMole(Math.floor(Math.random() * HOLES)), 400 + Math.max(0, 500 - score * 20));
    return () => clearTimeout(id);
  }, [playing, mole, score]);
  useEffect(() => { if (!playing && score > best) setBest(score); }, [playing, score, best]);

  const start = () => {
    if (fee) {
      const err = sessionGate.act ? sessionGate.act(lot!.id, { type: 'play', fee }, fee) : '接続していません';
      if (err) { setError(err); return; }
    }
    setError(''); setScore(0); setLeft(SECONDS); setEndAt(performance.now() + SECONDS * 1000);
  };
  const hit = (i: number) => { if (playing && i === mole) { setScore((s) => s + 1); setMole(-1); } };

  return <Modal title={`🕹 ${shop?.name ?? 'ゲーム機'}のモグラたたき`} onClose={() => close(null)} tabs={[]} tab="" onTab={() => undefined} className="shop-panel">
    {!lot ? <p>ゲーム機の前で開いてください。</p> : <>
      <p className="shop-note">{SECONDS}秒で、出てきたモグラをたくさんたたいてください。{fee ? `1回 ${yen(fee)}（お店に払います）` : owner && shared ? '自分のお店なので無料です。' : '無料'}</p>
      <div className="arcade-head"><b>{playing ? `残り ${Math.ceil(left)} 秒` : '待機中'}</b><span>スコア {score}</span><span>ベスト {best}</span></div>
      <div className="arcade-grid">{Array.from({ length: HOLES }, (_, i) => <button key={i} className={`arcade-hole${i === mole ? ' up' : ''}`} aria-label={i === mole ? 'モグラ' : '穴'} onClick={() => hit(i)}>{i === mole ? '🐹' : ''}</button>)}</div>
      {error && <p className="warn" role="alert">{error}</p>}
      {!playing && <button className="btn primary" disabled={money < fee} onClick={start}>{fee ? `${yen(fee)} で遊ぶ` : '遊ぶ'}</button>}
    </>}
  </Modal>;
}
