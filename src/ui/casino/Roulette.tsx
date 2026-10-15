// ルーレット（ヨーロピアン、0〜36）
import { useEffect, useRef, useState } from 'react';
import { rouletteBetName, rouletteColor, roulettePayout, spinRoulette } from '../../economy/casino';
import type { RouletteBet } from '../../economy/casino';
import { yen } from '../../economy/money';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { BetInput } from './BetInput';

const OUTSIDE: RouletteBet[] = [
  { kind: 'red' },
  { kind: 'black' },
  { kind: 'odd' },
  { kind: 'even' },
  { kind: 'low' },
  { kind: 'high' },
  { kind: 'dozen', dozen: 1 },
  { kind: 'dozen', dozen: 2 },
  { kind: 'dozen', dozen: 3 },
];
const SPIN_MS = 2200;

const sameBet = (a: RouletteBet, b: RouletteBet) => JSON.stringify(a) === JSON.stringify(b);
const payoutLabel = (b: RouletteBet) => (b.kind === 'number' ? '×36' : b.kind === 'dozen' ? '×3' : '×2');

export function Roulette() {
  const [bet, setBet] = useState(10_000);
  const [choice, setChoice] = useState<RouletteBet>({ kind: 'red' });
  const [shown, setShown] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ n: number; win: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const pending = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const notify = useGame((s) => s.notify);
  useEffect(
    () => () => {
      timers.current.forEach((t) => (clearTimeout(t), clearInterval(t)));
      if (pending.current > 0) useEconomy.getState().collect(pending.current, 'ルーレット 払戻');
    },
    [],
  );

  const spin = () => {
    if (!useEconomy.getState().placeBet(bet, `ルーレット（${rouletteBetName(choice)}）`)) return notify('賭け金が所持金を超えています');
    const n = spinRoulette(Math.random);
    const win = bet * roulettePayout(choice, n);
    pending.current = win;
    setSpinning(true);
    setResult(null);
    const started = performance.now();
    // だんだん遅くなるように数字を回す
    const step = () => {
      const t = (performance.now() - started) / SPIN_MS;
      if (t >= 1) {
        setShown(n);
        pending.current = 0;
        useEconomy.getState().collect(win, 'ルーレット 払戻');
        setResult({ n, win });
        setHistory((h) => [n, ...h].slice(0, 12));
        setSpinning(false);
        return;
      }
      setShown(Math.floor(Math.random() * 37));
      timers.current = [setTimeout(step, 40 + t * t * 260)];
    };
    step();
  };

  return (
    <div className="game roulette">
      <div className="wheel-row">
        <div className={`wheel ${shown === null ? '' : rouletteColor(shown)}${spinning ? ' spinning' : ''}`}>{shown ?? '?'}</div>
        <div className="history">
          {history.map((n, i) => (
            <span key={i} className={`pill ${rouletteColor(n)}`}>{n}</span>
          ))}
        </div>
      </div>
      <div className="result-line">
        {result ? (
          result.win > 0 ? <b className="plus">{result.n}！ {yen(result.win)} 獲得</b> : <span className="muted">{result.n}　はずれ</span>
        ) : ' '}
      </div>
      <div className="field-label">どこに賭ける？　いまの選択：<b>{rouletteBetName(choice)}</b>（{payoutLabel(choice)}）</div>
      <div className="row">
        {OUTSIDE.map((b) => (
          <button key={JSON.stringify(b)} className={`btn small${sameBet(b, choice) ? ' on' : ''} ${b.kind}`} disabled={spinning} onClick={() => setChoice(b)}>
            {rouletteBetName(b)}
          </button>
        ))}
      </div>
      <div className="numbers">
        {Array.from({ length: 37 }, (_, n) => (
          <button
            key={n}
            className={`num-cell ${rouletteColor(n)}${sameBet({ kind: 'number', number: n }, choice) ? ' on' : ''}`}
            disabled={spinning}
            onClick={() => setChoice({ kind: 'number', number: n })}
          >
            {n}
          </button>
        ))}
      </div>
      <BetInput value={bet} onChange={setBet} disabled={spinning} />
      <button className="btn primary big-btn" disabled={spinning || bet <= 0} onClick={spin}>
        {spinning ? '回転中…' : 'ボールを投げる'}
      </button>
      <p className="muted">0 が出ると一点賭け（0）以外は負け。還元率 97.3%</p>
    </div>
  );
}
