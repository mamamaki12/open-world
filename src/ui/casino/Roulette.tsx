// ルーレット（ヨーロピアン、0〜36）。台にチップを何か所でも置いて、ホイールに玉を投げる
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { WHEEL_ORDER, rouletteBetName, rouletteColor, roulettePayout, spinRoulette } from '../../economy/casino';
import type { RouletteBet } from '../../economy/casino';
import { yen } from '../../economy/money';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { CHIP_VALUES, Chip, WinBurst, chipLabel } from './Chips';
import { sfxBallRoll, sfxChip, sfxLose, sfxWin } from './sfx';

const SPIN_MS = 5200;
const TAU = Math.PI * 2;
const POCKET = TAU / 37;
const R = { rim: 146, track: 134, ring: 128, pocketIn: 96, num: 115, rest: 104, cone: 92 };

const keyOf = (b: RouletteBet) => JSON.stringify(b);
const pocketAngle = (n: number) => WHEEL_ORDER.indexOf(n) * POCKET;
const polar = (r: number, a: number) => ({ x: r * Math.sin(a), y: -r * Math.cos(a) });

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

function Wheel({ wheelRef, ballRef }: { wheelRef: RefObject<SVGGElement>; ballRef: RefObject<SVGCircleElement> }) {
  const pockets = useMemo(
    () =>
      WHEEL_ORDER.map((n, i) => {
        const a0 = i * POCKET - POCKET / 2;
        const a1 = a0 + POCKET;
        const p = [polar(R.ring, a0), polar(R.ring, a1), polar(R.pocketIn, a1), polar(R.pocketIn, a0)];
        const d = `M${p[0].x},${p[0].y} A${R.ring},${R.ring} 0 0 1 ${p[1].x},${p[1].y} L${p[2].x},${p[2].y} A${R.pocketIn},${R.pocketIn} 0 0 0 ${p[3].x},${p[3].y}Z`;
        const t = polar(R.num, i * POCKET);
        return { n, d, t, rot: (i * POCKET * 180) / Math.PI };
      }),
    [],
  );
  return (
    <svg className="roulette-wheel" viewBox="-150 -150 300 300" role="img" aria-label="ルーレットのホイール">
      <defs>
        <radialGradient id="rw-wood" r="0.5">
          <stop offset="0.85" stopColor="#6b3d1e" />
          <stop offset="0.93" stopColor="#8a5329" />
          <stop offset="1" stopColor="#3c2210" />
        </radialGradient>
        <radialGradient id="rw-cone" r="0.5">
          <stop offset="0" stopColor="#f6dc8a" />
          <stop offset="0.55" stopColor="#c9a03c" />
          <stop offset="1" stopColor="#6e5418" />
        </radialGradient>
      </defs>
      <circle r={R.rim} fill="url(#rw-wood)" />
      <circle r={R.track + 4} fill="#2b1a0f" />
      <circle r={R.track - 3} fill="#d9cdb4" opacity="0.18" />
      <g ref={wheelRef}>
        {pockets.map((p) => (
          <g key={p.n}>
            <path d={p.d} className={`pocket ${rouletteColor(p.n)}`} />
            <text x={p.t.x} y={p.t.y} transform={`rotate(${p.rot} ${p.t.x} ${p.t.y})`} className="pocket-num">
              {p.n}
            </text>
          </g>
        ))}
        <circle r={R.ring} fill="none" stroke="#c9a03c" strokeWidth="2" />
        <circle r={R.pocketIn} fill="none" stroke="#c9a03c" strokeWidth="2" />
        <circle r={R.cone} fill="url(#rw-cone)" />
        <circle r={R.cone * 0.62} fill="#3c2210" opacity="0.35" />
        {[0, 1, 2, 3].map((k) => (
          <rect key={k} x={-4} y={-44} width={8} height={88} rx={4} fill="#e8c766" stroke="#7a5c18" transform={`rotate(${k * 45})`} />
        ))}
        <circle r={10} fill="#f6dc8a" stroke="#7a5c18" />
      </g>
      <circle ref={ballRef} r={5.5} className="ball" cx={0} cy={-R.rest} />
    </svg>
  );
}

interface Placement {
  key: string;
  bet: RouletteBet;
  amount: number;
}

export function Roulette() {
  const [chip, setChip] = useState<number>(10_000);
  const [placed, setPlaced] = useState<Placement[]>([]);
  const [lastPlaced, setLastPlaced] = useState<Placement[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ n: number; win: number; stake: number; id: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const money = useEconomy((s) => s.money);
  const notify = useGame((s) => s.notify);
  const wheelRef = useRef<SVGGElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);
  const motion = useRef({ wheel: 0, omega: 0.7, ballRel: pocketAngle(0), ballR: R.rest, ballVisible: false, spin: null as null | { t0: number; relEnd: number; delta: number; done: () => void } });
  const pending = useRef(0);

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
      wheelRef.current?.setAttribute('transform', `rotate(${(m.wheel * 180) / Math.PI})`);
      const b = polar(m.ballR, m.wheel + m.ballRel);
      if (ballRef.current) {
        ballRef.current.setAttribute('cx', b.x.toFixed(2));
        ballRef.current.setAttribute('cy', b.y.toFixed(2));
        ballRef.current.style.opacity = m.ballVisible ? '1' : '0';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
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
      },
    };
  };

  const hit = (b: RouletteBet) => result !== null && roulettePayout(b, result.n) > 0;
  const level: 0 | 1 | 2 = result && result.win > 0 ? (result.win >= result.stake * 10 ? 2 : result.win > result.stake ? 1 : 0) : 0;

  return (
    <div className="game roulette">
      <div className="roulette-top">
        <div className="wheel-wrap">
          <Wheel wheelRef={wheelRef} ballRef={ballRef} />
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

      <div className="felt-scroll">
        <div className="roulette-table">
          {SPOTS.map((s) => {
            const k = keyOf(s.bet);
            const amt = totals.get(k) ?? 0;
            return (
              <button
                key={k}
                className={`spot ${s.cls}${hit(s.bet) ? ' hit' : ''}${result && amt > 0 && !hit(s.bet) ? ' lost' : ''}`}
                style={{ gridColumn: s.col, gridRow: s.row }}
                onClick={() => place(s.bet)}
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
        マスを押すと、持っているチップを置きます（右クリックでそのマスのチップを外す）。数字 ×36、列・ダース ×3、赤黒・奇数偶数・前半後半 ×2。0 が出ると 0 以外は負け。還元率 97.3%
      </p>
    </div>
  );
}
