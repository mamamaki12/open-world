// スロット：3本のリールが左から順に止まる
import { useEffect, useRef, useState } from 'react';
import { CHERRY_PAY, REEL_SYMBOLS, SLOT_FACES, SLOT_PAYS, slotMultiplier, slotReturnRate, spinSlots } from '../../economy/casino';
import type { SlotSymbol } from '../../economy/casino';
import { yen } from '../../economy/money';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { BetInput } from './BetInput';

const STOP_MS = [700, 1100, 1500];

export function Slots() {
  const [bet, setBet] = useState(10_000);
  const [reels, setReels] = useState<SlotSymbol[]>(['seven', 'bar', 'bell']);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ win: number; mult: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** まだ払い戻していない当たり（途中で画面を閉じても払い戻す） */
  const pending = useRef(0);
  const notify = useGame((s) => s.notify);
  useEffect(
    () => () => {
      timers.current.forEach((t) => (clearTimeout(t), clearInterval(t)));
      if (pending.current > 0) useEconomy.getState().collect(pending.current, 'スロット 払戻');
    },
    [],
  );

  const spin = () => {
    if (!useEconomy.getState().placeBet(bet, 'スロット')) return notify('賭け金が所持金を超えています');
    const final = spinSlots(Math.random);
    const mult = slotMultiplier(final);
    const win = Math.floor(bet * mult);
    pending.current = win;
    setSpinning(true);
    setResult(null);
    const stopped = [false, false, false];
    const roll = setInterval(() => {
      setReels((r) => r.map((s, i) => (stopped[i] ? s : REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)])));
    }, 60);
    timers.current = [roll];
    STOP_MS.forEach((ms, i) => {
      timers.current.push(
        setTimeout(() => {
          stopped[i] = true;
          setReels((r) => r.map((s, j) => (j === i ? final[i] : s)));
          if (i === 2) {
            clearInterval(roll);
            pending.current = 0;
            useEconomy.getState().collect(win, 'スロット 払戻');
            setResult({ win, mult });
            setSpinning(false);
          }
        }, ms),
      );
    });
  };

  return (
    <div className="game slots">
      <div className={`reels${result && result.mult >= 15 ? ' jackpot' : ''}`}>
        {reels.map((s, i) => (
          <div key={i} className={`reel ${s}`}>{SLOT_FACES[s]}</div>
        ))}
      </div>
      <div className="result-line">
        {result ? (result.win > 0 ? <b className="plus">×{result.mult}　{yen(result.win)} 獲得！</b> : <span className="muted">はずれ</span>) : ' '}
      </div>
      <BetInput value={bet} onChange={setBet} disabled={spinning} />
      <button className="btn primary big-btn" disabled={spinning || bet <= 0} onClick={spin}>
        {spinning ? '回転中…' : 'レバーを引く'}
      </button>
      <table className="ledger compact paytable">
        <tbody>
          {(Object.keys(SLOT_PAYS) as (keyof typeof SLOT_PAYS)[]).map((s) => (
            <tr key={s}>
              <td>{SLOT_FACES[s]} {SLOT_FACES[s]} {SLOT_FACES[s]}</td>
              <td className="num">×{SLOT_PAYS[s]}</td>
            </tr>
          ))}
          <tr><td>左に {SLOT_FACES.cherry}</td><td className="num">×{CHERRY_PAY}（元返し）</td></tr>
        </tbody>
      </table>
      <p className="muted">還元率 {(slotReturnRate() * 100).toFixed(1)}%</p>
    </div>
  );
}
