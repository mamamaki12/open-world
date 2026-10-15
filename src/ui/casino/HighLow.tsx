// ハイ＆ロー：次のカードが今より大きいか小さいか。当てたら続けて倍々に挑める（3Dのカードテーブル）
import { useEffect, useRef, useState } from 'react';
import { cardName, drawCard, highLowMultiplier, highLowWins } from '../../economy/casino';
import { yen } from '../../economy/money';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { BetInput } from './BetInput';
import { WinBurst } from './Chips';
import { sfxCard, sfxLose, sfxWin } from './sfx';
import { CardTable3D } from './three/CardTable3D';
import { Stage } from './three/Stage';

const SUITS = ['♠', '♥', '♦', '♣'];
const suit = () => SUITS[Math.floor(Math.random() * 4)];
const FLIP_MS = 650;

interface Card {
  rank: number;
  suit: string;
  id: number;
}

let nextId = 1;
const newCard = (): Card => ({ rank: drawCard(Math.random), suit: suit(), id: nextId++ });

export function HighLow() {
  const [bet, setBet] = useState(10_000);
  const [card, setCard] = useState<Card>(newCard);
  /** めくっている最中のカード */
  const [flipping, setFlipping] = useState<{ card: Card; win: boolean } | null>(null);
  /** 勝負中の持ち分（0 なら勝負していない） */
  const [pot, setPot] = useState(0);
  const [streak, setStreak] = useState(0);
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null);
  const [past, setPast] = useState<Card[]>([]);
  const [burst, setBurst] = useState<{ id: number; amount: number; level: 0 | 1 | 2 } | null>(null);
  const potRef = useRef(0);
  potRef.current = pot;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const notify = useGame((s) => s.notify);
  // 勝ち分を持ったまま画面を閉じたら受け取ったことにする
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (potRef.current > 0) useEconomy.getState().collect(potRef.current, 'ハイ＆ロー 払戻');
    },
    [],
  );

  const guess = (g: 'high' | 'low') => {
    if (flipping) return;
    let stake = pot;
    if (stake === 0) {
      if (!useEconomy.getState().placeBet(bet, 'ハイ＆ロー')) return notify('賭け金が所持金を超えています');
      stake = bet;
    }
    const mult = highLowMultiplier(card.rank, g);
    const next = newCard();
    const win = highLowWins(card.rank, next.rank, g);
    setOutcome(null);
    setFlipping({ card: next, win });
    sfxCard();
    // 勝負の結果は、めくり終わってから出す（そのあいだに閉じても持ち分は正しい）
    const newPot = win ? Math.floor(stake * mult) : 0;
    setPot(newPot);
    potRef.current = newPot;
    timers.current.push(
      setTimeout(() => {
        setPast((p) => [card, ...p].slice(0, 8));
        setCard(next);
        setFlipping(null);
        setOutcome(win ? 'win' : 'lose');
        if (win) {
          setStreak((s) => s + 1);
          sfxWin(0);
        } else {
          setStreak(0);
          sfxLose();
        }
      }, FLIP_MS),
    );
  };

  const take = () => {
    const amount = pot;
    useEconomy.getState().collect(amount, `ハイ＆ロー 払戻（${streak}連勝）`);
    const level: 0 | 1 | 2 = amount >= bet * 20 ? 2 : amount >= bet * 3 ? 1 : 0;
    sfxWin(level);
    setBurst({ id: performance.now(), amount, level });
    notify(`${yen(amount)} を受け取りました`);
    setPot(0);
    setStreak(0);
    setOutcome(null);
  };

  const hi = highLowMultiplier(card.rank, 'high');
  const lo = highLowMultiplier(card.rank, 'low');
  const stake = pot > 0 ? pot : bet;
  return (
    <div className="game highlow">
      <div className={`hl-table${outcome ? ` ${outcome}` : ''}`}>
        <Stage camera={{ position: [0.15, 1.75, 1.75], fov: 40 }} target={[0.1, 0, 0.05]} height={320} label="カードテーブル">
          <CardTable3D current={card} incoming={flipping?.card ?? null} past={past} />
        </Stage>
        <div className="hl-info">
          {pot > 0 ? (
            <>
              <div className="streak">{'★'.repeat(Math.min(streak, 10))} {streak}連勝中！</div>
              <div className="pot">持ち分 <b>{yen(pot)}</b></div>
              <div className="muted">続けて当てれば、さらに倍になります。</div>
            </>
          ) : outcome === 'lose' ? (
            <div className="lose-text">はずれ… 次こそ！</div>
          ) : (
            <div className="muted">次のカードは、この <b>{cardName(card.rank)}</b> より大きい？小さい？<br />同じ数字は負けです。</div>
          )}
          <div className="hl-odds">
            <span>ハイなら <b>{hi ? yen(Math.floor(stake * hi)) : '―'}</b></span>
            <span>ローなら <b>{lo ? yen(Math.floor(stake * lo)) : '―'}</b></span>
          </div>
        </div>
        {burst && burst.level > 0 && <WinBurst key={burst.id} level={burst.level} amount={burst.amount} text="GET!" />}
      </div>
      <div className="hl-buttons">
        <button className="btn hl-btn high" disabled={hi === 0 || !!flipping} onClick={() => guess('high')}>
          ▲ ハイ<small>×{hi || '-'}</small>
        </button>
        <button className="btn hl-btn low" disabled={lo === 0 || !!flipping} onClick={() => guess('low')}>
          ▼ ロー<small>×{lo || '-'}</small>
        </button>
        {pot > 0 && !flipping && (
          <button className="btn hl-btn take" onClick={take}>
            受け取る<small>{yen(pot)}</small>
          </button>
        )}
      </div>
      {pot === 0 && !flipping && <BetInput value={bet} onChange={setBet} />}
      <p className="muted">倍率は当たりやすさから決まります（還元率 95%）。</p>
    </div>
  );
}
