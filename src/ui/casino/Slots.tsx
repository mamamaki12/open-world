import { iconText } from '../AppIcon';
// スロット：3Dの台で3本のリールが回って、左から順に止まる
import { useEffect, useMemo, useRef, useState } from 'react';
import { CHERRY_PAY, REEL_SYMBOLS, SLOT_FACES, SLOT_PAYS, slotMultiplier, slotReturnRate, spinSlots } from '../../economy/casino';
import type { SlotSymbol } from '../../economy/casino';
import { yen } from '../../economy/money';
import { seeded } from '../../economy/rng';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { BetInput } from './BetInput';
import { WinBurst } from './Chips';
import { sfxLever, sfxLose, sfxReelStop, sfxWin } from './sfx';
import { SlotMachine3D } from './three/SlotMachine3D';
import { Stage } from './three/Stage';

/** 回り始めてから各リールが止まり始めるまで（ms） */
const STOP_AT = [900, 1350, 1800];
/** 止まるときにすべる時間（ms） */
const SETTLE = 420;
/** 回っている速さ（絵柄/秒） */
const SPEED = 22;

/** リールの絵柄の並び（同じ絵柄が固まらないよう、決まった順に混ぜる） */
function makeStrip(seed: number): SlotSymbol[] {
  const rng = seeded(seed);
  const s = [...REEL_SYMBOLS];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

interface ReelMotion {
  pos: number;
  /** 'spin' 回転中 / 'settle' 止まる途中 / 'stop' 止まっている */
  phase: 'spin' | 'settle' | 'stop';
  from: number;
  to: number;
  t0: number;
}

const easeOutBack = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

function Symbol({ s }: { s: SlotSymbol }) {
  return <div className={`sym ${s}`}>{iconText(SLOT_FACES[s])}</div>;
}

export function Slots() {
  const [bet, setBet] = useState(10_000);
  const strips = useMemo(() => [makeStrip(11), makeStrip(23), makeStrip(37)], []);
  const reels = useRef<ReelMotion[]>(strips.map((st, i) => ({ pos: st.indexOf(['seven', 'bar', 'bell'][i] as SlotSymbol), phase: 'stop', from: 0, to: 0, t0: 0 })));
  const neighborL = useRef([{ pos: 3 }, { pos: 9 }, { pos: 14 }]);
  const neighborR = useRef([{ pos: 6 }, { pos: 1 }, { pos: 17 }]);
  const [spinning, setSpinning] = useState(false);
  const [lever, setLever] = useState(false);
  const [result, setResult] = useState<{ win: number; mult: number; id: number } | null>(null);
  const raf = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** まだ払い戻していない当たり（途中で画面を閉じても払い戻す） */
  const pending = useRef(0);
  const notify = useGame((s) => s.notify);
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      timers.current.forEach(clearTimeout);
      if (pending.current > 0) useEconomy.getState().collect(pending.current, 'スロット 払戻');
    },
    [],
  );

  const spin = () => {
    if (spinning) return;
    if (bet <= 0) return;
    if (!useEconomy.getState().placeBet(bet, 'スロット')) return notify('賭け金が所持金を超えています');
    const final = spinSlots(Math.random);
    const mult = slotMultiplier(final);
    const win = Math.floor(bet * mult);
    pending.current = win;
    setSpinning(true);
    setResult(null);
    setLever(true);
    sfxLever();
    timers.current.push(setTimeout(() => setLever(false), 350));
    const start = performance.now();
    let last = start;
    reels.current.forEach((r) => (r.phase = 'spin'));
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      reels.current.forEach((r, i) => {
        const n = strips[i].length;
        if (r.phase === 'spin') {
          r.pos += SPEED * dt;
          if (now - start >= STOP_AT[i]) {
            // 次に来る「出目」の位置まで、少し行き過ぎて戻るように止める
            let to = Math.ceil(r.pos) + 2;
            while (strips[i][((to % n) + n) % n] !== final[i]) to++;
            r.phase = 'settle';
            r.from = r.pos;
            r.to = to;
            r.t0 = now;
          }
        } else if (r.phase === 'settle') {
          const t = Math.min(1, (now - r.t0) / SETTLE);
          r.pos = r.from + (r.to - r.from) * easeOutBack(t);
          if (t >= 1) {
            r.phase = 'stop';
            r.pos = r.to % n;
            sfxReelStop(i);
          }
        }
      });
      if (reels.current.every((r) => r.phase === 'stop')) {
        pending.current = 0;
        useEconomy.getState().collect(win, 'スロット 払戻');
        setResult({ win, mult, id: now });
        setSpinning(false);
        if (win > 0) sfxWin(mult >= 200 ? 2 : mult >= 15 ? 1 : 0);
        else sfxLose();
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const big = result && result.mult >= 15;
  const level: 0 | 1 | 2 = result ? (result.mult >= 200 ? 2 : result.mult >= 15 ? 1 : 0) : 0;
  return (
    <div className="game slots">
      <div className={`slot-floor${big ? ' big-win' : ''}`}>
        <Stage camera={{ position: [0.5, 0.75, 3.3], fov: 40 }} target={[0.05, 0.42, 0]} height={460} label="スロット台">
          {/* となりに並ぶ台（飾り） */}
          <SlotMachine3D strips={strips} reels={neighborL} spinning={false} win={false} big={false} pulled={false} onPull={() => undefined} color="#1d3f9e" position={[-1.42, 0, -0.18]} rotationY={0.22} floor={false} />
          <SlotMachine3D strips={strips} reels={neighborR} spinning={false} win={false} big={false} pulled={false} onPull={() => undefined} color="#5b1d8f" position={[1.42, 0, -0.18]} rotationY={-0.22} floor={false} />
          <SlotMachine3D
            strips={strips}
            reels={reels}
            spinning={spinning}
            win={!!result && result.win > 0}
            big={!!big}
            pulled={lever}
            onPull={spin}
          />
        </Stage>
        <div className="slot-display">
          {result ? (
            result.win > 0 ? (
              <b className="plus">{iconText("×")}{result.mult}　{yen(result.win)}</b>
            ) : (
              <span>はずれ　また挑戦！</span>
            )
          ) : spinning ? (
            <span className="blink">GOOD LUCK!</span>
          ) : (
            <span>BET {yen(bet)}　レバーか赤いボタンで回す</span>
          )}
        </div>
        {result && result.win > 0 && level > 0 && (
          <WinBurst key={result.id} level={level} amount={result.win} text={level === 2 ? 'JACKPOT!!' : 'BIG WIN!'} />
        )}
      </div>
      <BetInput value={bet} onChange={setBet} disabled={spinning} />
      <button className="btn casino-go big-btn" disabled={spinning || bet <= 0} onClick={spin}>
        {spinning ? '回転中…' : 'レバーを引く'}
      </button>
      <div className="paytable-board">
        {(Object.keys(SLOT_PAYS) as (keyof typeof SLOT_PAYS)[]).map((s) => (
          <div key={s} className="pay-row">
            <span className="pay-syms">
              <Symbol s={s} />
              <Symbol s={s} />
              <Symbol s={s} />
            </span>
            <b>{iconText("×")}{iconText(SLOT_PAYS[s])}</b>
          </div>
        ))}
        <div className="pay-row">
          <span className="pay-syms">
            <Symbol s="cherry" />
            <small>左だけ</small>
          </span>
          <b>{iconText("×")}{CHERRY_PAY}</b>
        </div>
        <p className="muted">還元率 {(slotReturnRate() * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}
