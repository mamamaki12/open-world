// ルーレット（ヨーロピアン、0〜36）。台にチップを何か所でも置いて、ホイールに玉を投げる
import { useEffect, useMemo, useRef, useState } from 'react';
import { WHEEL_ORDER, rouletteBetName, rouletteColor, roulettePayout, spinRoulette } from '../../economy/casino';
import type { RouletteBet } from '../../economy/casino';
import { yen } from '../../economy/money';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { CHIP_VALUES, Chip, WinBurst, chipLabel } from './Chips';
import { sfxBallRoll, sfxChip, sfxLose, sfxWin } from './sfx';
import { speak, stopSpeaking } from './voice';
import { RouletteWheel3D } from './three/RouletteWheel3D';
import { Stage } from './three/Stage';

const SPIN_MS = 5200;
const TAU = Math.PI * 2;
const POCKET = TAU / 37;
const R = { track: 134, rest: 104 };

const keyOf = (b: RouletteBet) => JSON.stringify(b);
const pocketAngle = (n: number) => WHEEL_ORDER.indexOf(n) * POCKET;

interface Spot {
  bet: RouletteBet;
  label: string;
  col: string;
  row: string;
  cls: string;
}

/** 台のマス（本物と同じ並び：0、3段×12列の数字、列・ダース・外側の賭け） */
const SPOTS: Spot[] = [
  { bet: { kind: 'number', number: 0 }, label: '0', col: '1', row: '1 / 4', cls: 'num green zero' },
  ...Array.from({ length: 36 }, (_, i) => {
    const n = i + 1;
    return { bet: { kind: 'number', number: n } as RouletteBet, label: String(n), col: String(2 + Math.floor(i / 3)), row: String(3 - (i % 3)), cls: `num ${rouletteColor(n)}` };
  }),
  ...([3, 2, 1] as const).map((c, i) => ({ bet: { kind: 'column', column: c } as RouletteBet, label: '2 to 1', col: '14', row: String(i + 1), cls: 'outside col' })),
  ...([1, 2, 3] as const).map((d) => ({ bet: { kind: 'dozen', dozen: d } as RouletteBet, label: ['1st 12', '2nd 12', '3rd 12'][d - 1], col: `${2 + (d - 1) * 4} / span 4`, row: '4', cls: 'outside' })),
  { bet: { kind: 'low' }, label: '1-18', col: '2 / span 2', row: '5', cls: 'outside' },
  { bet: { kind: 'even' }, label: 'EVEN', col: '4 / span 2', row: '5', cls: 'outside' },
  { bet: { kind: 'red' }, label: '◆', col: '6 / span 2', row: '5', cls: 'outside diamond red' },
  { bet: { kind: 'black' }, label: '◆', col: '8 / span 2', row: '5', cls: 'outside diamond black' },
  { bet: { kind: 'odd' }, label: 'ODD', col: '10 / span 2', row: '5', cls: 'outside' },
  { bet: { kind: 'high' }, label: '19-36', col: '12 / span 2', row: '5', cls: 'outside' },
];

const payoutOf = (b: RouletteBet) => (b.kind === 'number' ? 36 : b.kind === 'dozen' || b.kind === 'column' ? 3 : 2);

interface Placement {
  key: string;
  bet: RouletteBet;
  amount: number;
}

export function Roulette() {
  const [removing, setRemoving] = useState(false);
  const [chip, setChip] = useState<number>(10_000);
  const [placed, setPlaced] = useState<Placement[]>([]);
  const [lastPlaced, setLastPlaced] = useState<Placement[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ n: number; win: number; stake: number; id: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const money = useEconomy((s) => s.money);
  const notify = useGame((s) => s.notify);
  const motion = useRef({ wheel: 0, omega: 0.7, ballRel: pocketAngle(0), ballR: R.rest, ballVisible: false, spin: null as null | { t0: number; relEnd: number; delta: number; done: () => void } });
  const pending = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ホイールはいつもゆっくり回っている。投げたら速く回して、だんだん遅くする
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = motion.current;
      let omega = 0.5;
      if (m.spin) {
        const t = Math.min(1, (now - m.spin.t0) / SPIN_MS);
        omega = 0.5 + 5.5 * (1 - t) ** 2;
        const ease = 1 - (1 - t) ** 3;
        m.ballRel = m.spin.relEnd + m.spin.delta * (1 - ease);
        if (t < 0.62) m.ballR = R.track;
        else {
          const u = (t - 0.62) / 0.38;
          m.ballR = R.rest + (R.track - R.rest) * (1 - u) ** 2 * Math.abs(Math.cos(u * Math.PI * 2.5));
        }
        if (t >= 1) {
          m.ballRel = m.spin.relEnd;
          m.ballR = R.rest;
          const done = m.spin.done;
          m.spin = null;
          done();
        }
      }
      m.wheel += omega * dt;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      timers.current.forEach(clearTimeout);
      stopSpeaking();
      if (pending.current > 0) useEconomy.getState().collect(pending.current, 'ルーレット 払戻');
    };
  }, []);

  const totals = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of placed) m.set(p.key, (m.get(p.key) ?? 0) + p.amount);
    return m;
  }, [placed]);
  const total = placed.reduce((s, p) => s + p.amount, 0);

  const place = (bet: RouletteBet) => {
    if (spinning) return;
    if (result) setResult(null);
    sfxChip();
    setPlaced((ps) => [...ps, { key: keyOf(bet), bet, amount: chip }]);
  };
  const removeSpot = (bet: RouletteBet) => {
    if (spinning) return;
    const k = keyOf(bet);
    setPlaced((ps) => ps.filter((p) => p.key !== k));
  };

  const spin = () => {
    if (spinning || total <= 0) return;
    if (!useEconomy.getState().placeBet(total, `ルーレット（${totals.size}か所）`)) return notify('賭け金が所持金を超えています');
    const n = spinRoulette(Math.random);
    const win = placed.reduce((s, p) => s + p.amount * roulettePayout(p.bet, n), 0);
    pending.current = win;
    const stake = total;
    const bets = placed;
    setSpinning(true);
    setResult(null);
    sfxBallRoll(SPIN_MS / 1000);
    // ディーラーの声：玉を投げて少ししたら締め切り、止まったら出目を読み上げる
    speak('ボールが入りました', { rate: 1.05 });
    timers.current.push(setTimeout(() => speak('ノー・モア・ベット', { rate: 1 }), 2600));
    const m = motion.current;
    m.ballVisible = true;
    m.spin = {
      t0: performance.now(),
      relEnd: pocketAngle(n),
      // 玉はホイールと逆向きに何周も回ってから落ちる
      delta: TAU * 9 + Math.random() * TAU,
      done: () => {
        pending.current = 0;
        useEconomy.getState().collect(win, 'ルーレット 払戻');
        setResult({ n, win, stake, id: performance.now() });
        setHistory((h) => [n, ...h].slice(0, 16));
        setLastPlaced(bets);
        setSpinning(false);
        if (win > 0) sfxWin(win >= stake * 10 ? 2 : win > stake ? 1 : 0);
        else sfxLose();
        speak(n === 0 ? 'ゼロ、グリーン' : `${n}、${rouletteColor(n) === 'red' ? 'レッド' : 'ブラック'}${n % 2 ? '、オッド' : '、イーブン'}`, { rate: 1, interrupt: true });
      },
    };
  };

  const hit = (b: RouletteBet) => result !== null && roulettePayout(b, result.n) > 0;
  const level: 0 | 1 | 2 = result && result.win > 0 ? (result.win >= result.stake * 10 ? 2 : result.win > result.stake ? 1 : 0) : 0;

  return (
    <div className="game roulette">
      <div className="roulette-top">
        <div className="wheel-wrap">
          <Stage camera={{ position: [0, 1.5, 1.55], fov: 42 }} target={[0, 0, 0.08]} height={360} label="ルーレットのホイール">
            <RouletteWheel3D motion={motion} />
          </Stage>
          {result && (
            <div key={result.id} className={`winning-number ${rouletteColor(result.n)}`}>
              {result.n}
            </div>
          )}
        </div>
        <div className="roulette-side">
          <div className="tote">
            <div className="tote-title">これまでの出目</div>
            <div className="tote-list">
              {history.length === 0 && <span className="muted">まだありません</span>}
              {history.map((n, i) => (
                <span key={i} className={`tote-n ${rouletteColor(n)}${i === 0 ? ' latest' : ''}`}>
                  {n}
                </span>
              ))}
            </div>
          </div>
          <div className="roulette-result">
            {spinning ? (
              <span className="blink">ノー・モア・ベット</span>
            ) : result ? (
              result.win > 0 ? (
                <b className="plus">
                  {result.n} {result.n === 0 ? '' : rouletteColor(result.n) === 'red' ? '赤' : '黒'}！ {yen(result.win)} の払い戻し
                </b>
              ) : (
                <span>
                  {result.n} {result.n === 0 ? '' : rouletteColor(result.n) === 'red' ? '赤' : '黒'}　はずれ
                </span>
              )
            ) : (
              <span>チップを選んで、台に置いてください</span>
            )}
          </div>
          <div className="bet-total">
            賭け金 <b className={total > money ? 'minus' : ''}>{yen(total)}</b>
            <small>（{totals.size}か所）</small>
          </div>
        </div>
        {level > 0 && result && <WinBurst key={result.id} level={level} amount={result.win} text={level === 2 ? 'BIG WIN!!' : 'WIN!'} />}
      </div>

      <div className="roulette-touch-tools">
        <p className="scroll-hint">← 台を左右になぞると、残りの数字・賭け方を表示できます →</p>
        <button className="btn small" aria-pressed={removing} disabled={spinning} onClick={() => setRemoving(v => !v)}>{removing ? 'チップを外す：ON（マスをタップ）' : 'チップを外すモード'}</button>
      </div>
      <div className="felt-scroll" tabIndex={0} aria-label="ルーレットの賭け台。左右にスクロールできます">
        <div className="roulette-table">
          {SPOTS.map((s) => {
            const k = keyOf(s.bet);
            const amt = totals.get(k) ?? 0;
            return (
              <button
                key={k}
                className={`spot ${s.cls}${hit(s.bet) ? ' hit' : ''}${result && amt > 0 && !hit(s.bet) ? ' lost' : ''}`}
                style={{ gridColumn: s.col, gridRow: s.row }}
                onClick={() => removing ? removeSpot(s.bet) : place(s.bet)}
                aria-label={`${rouletteBetName(s.bet)}（×${payoutOf(s.bet)}）${amt ? ` ${yen(amt)}` : ''}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  removeSpot(s.bet);
                }}
                disabled={spinning}
                title={`${rouletteBetName(s.bet)}（×${payoutOf(s.bet)}）${amt ? `　${yen(amt)}` : ''}`}
              >
                <span className="spot-label">{s.label}</span>
                {amt > 0 && <Chip value={amt} size={26} label={chipLabel(amt)} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="chip-tray">
        {CHIP_VALUES.map((c) => (
          <Chip key={c} value={c} on={chip === c} onClick={() => setChip(c)} disabled={spinning} title={`${yen(c)} のチップを持つ`} />
        ))}
        <span className="tray-ops">
          <button className="btn small" disabled={spinning || placed.length === 0} onClick={() => setPlaced((ps) => ps.slice(0, -1))}>1つ戻す</button>
          <button className="btn small" disabled={spinning || placed.length === 0} onClick={() => setPlaced([])}>クリア</button>
          <button className="btn small" disabled={spinning || placed.length === 0} onClick={() => setPlaced((ps) => [...ps, ...ps])}>×2</button>
          <button className="btn small" disabled={spinning || lastPlaced.length === 0} onClick={() => { setResult(null); setPlaced(lastPlaced); }}>前回と同じ</button>
        </span>
      </div>
      {total > money && <p className="warn">所持金（{yen(money)}）より多くは賭けられません。</p>}
      <button className="btn casino-go big-btn" disabled={spinning || total <= 0 || total > money} onClick={spin}>
        {spinning ? '回転中…' : `スピン（${yen(total)}）`}
      </button>
      <p className="muted">
        マスを押すと、持っているチップを置きます。「チップを外すモード」で外したいマスを押すと取り消せます。数字 ×36、列・ダース ×3、赤黒・奇数偶数・前半後半 ×2。0 が出ると 0 以外は負け。還元率 97.3%
      </p>
    </div>
  );
}
