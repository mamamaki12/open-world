// ハイ＆ロー：次のカードが今より大きいか小さいか。当てたら続けて倍々に挑める
import { useEffect, useRef, useState } from 'react';
import { cardName, drawCard, highLowMultiplier, highLowWins } from '../../economy/casino';
import { yen } from '../../economy/money';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { BetInput } from './BetInput';
import { WinBurst } from './Chips';
import { sfxCard, sfxLose, sfxWin } from './sfx';

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

/** トランプ1枚（表）。数字札はマークを並べ、絵札は大きな文字 */
export function PlayingCard({ card, size = 'big' }: { card: Card; size?: 'big' | 'small' }) {
  const red = card.suit === '♥' || card.suit === '♦';
  const name = cardName(card.rank);
  const face = card.rank >= 11;
  return (
    <div className={`pcard ${size}${red ? ' red' : ''}`}>
      <span className="corner tl">
        <b>{name}</b>
        {card.suit}
      </span>
      <span className="pcard-center">
        {size === 'small' ? (
          card.suit
        ) : face ? (
          <span className="face">
            <i>{card.rank === 13 ? '♚' : card.rank === 12 ? '♛' : '♞'}</i>
            {name}
          </span>
        ) : card.rank === 1 ? (
          <span className="ace">{card.suit}</span>
        ) : (
          <span className={`pips${card.rank <= 3 ? ' one' : ''}`}>
            {Array.from({ length: card.rank }, (_, i) => (
              <i key={i}>{card.suit}</i>
            ))}
          </span>
        )}
      </span>
      <span className="corner br">
        <b>{name}</b>
        {card.suit}
      </span>
    </div>
  );
}

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
        <div className="deck" aria-hidden>
          <div className="pcard-back" />
          <div className="pcard-back" />
          <div className="pcard-back" />
        </div>
        <div className="hl-current">
          <PlayingCard key={card.id} card={card} />
          {flipping && (
            <div className="flip-in" key={flipping.card.id}>
              <div className="flip-inner">
                <div className="flip-back">
                  <div className="pcard-back big" />
                </div>
                <div className="flip-front">
                  <PlayingCard card={flipping.card} />
                </div>
              </div>
            </div>
          )}
        </div>
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
      {past.length > 0 && (
        <div className="hl-past">
          <span className="muted">これまで</span>
          {past.map((c) => (
            <PlayingCard key={c.id} card={c} size="small" />
          ))}
        </div>
      )}
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
