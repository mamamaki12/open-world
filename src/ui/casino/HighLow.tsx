// ハイ＆ロー：次のカードが今より大きいか小さいか。当てたら続けて倍々に挑める
import { useEffect, useRef, useState } from 'react';
import { cardName, drawCard, highLowMultiplier, highLowWins } from '../../economy/casino';
import { yen } from '../../economy/money';
import { useEconomy } from '../../state/economy';
import { useGame } from '../../state/store';
import { BetInput } from './BetInput';

const SUITS = ['♠', '♥', '♦', '♣'];
const suit = () => SUITS[Math.floor(Math.random() * 4)];

interface Card {
  rank: number;
  suit: string;
}

export function HighLow() {
  const [bet, setBet] = useState(10_000);
  const [card, setCard] = useState<Card>({ rank: drawCard(Math.random), suit: suit() });
  /** 勝負中の持ち分（0 なら勝負していない） */
  const [pot, setPot] = useState(0);
  const [streak, setStreak] = useState(0);
  const [last, setLast] = useState<{ card: Card; win: boolean } | null>(null);
  const potRef = useRef(0);
  potRef.current = pot;
  const notify = useGame((s) => s.notify);
  // 勝ち分を持ったまま画面を閉じたら受け取ったことにする
  useEffect(
    () => () => {
      if (potRef.current > 0) useEconomy.getState().collect(potRef.current, 'ハイ＆ロー 払戻');
    },
    [],
  );

  const guess = (g: 'high' | 'low') => {
    let stake = pot;
    if (stake === 0) {
      if (!useEconomy.getState().placeBet(bet, 'ハイ＆ロー')) return notify('賭け金が所持金を超えています');
      stake = bet;
    }
    const mult = highLowMultiplier(card.rank, g);
    const next: Card = { rank: drawCard(Math.random), suit: suit() };
    const win = highLowWins(card.rank, next.rank, g);
    setLast({ card: next, win });
    setCard(next);
    if (win) {
      setPot(Math.floor(stake * mult));
      setStreak((s) => s + 1);
    } else {
      setPot(0);
      setStreak(0);
    }
  };

  const take = () => {
    useEconomy.getState().collect(pot, `ハイ＆ロー 払戻（${streak}連勝）`);
    notify(`${yen(pot)} を受け取りました`);
    setPot(0);
    setStreak(0);
  };

  const hi = highLowMultiplier(card.rank, 'high');
  const lo = highLowMultiplier(card.rank, 'low');
  const red = card.suit === '♥' || card.suit === '♦';
  return (
    <div className="game highlow">
      <div className="cards">
        <div className={`card-face${red ? ' red' : ''}`}>
          <span>{card.suit}</span>
          <b>{cardName(card.rank)}</b>
        </div>
        <div className="hl-info">
          {pot > 0 ? (
            <p>
              <b className="plus">{streak}連勝中！</b> 持ち分 <b className="big">{yen(pot)}</b>
              <br />
              このまま続けるか、受け取るか。
            </p>
          ) : last && !last.win ? (
            <p className="minus">はずれ…（{cardName(last.card.rank)}）</p>
          ) : (
            <p className="muted">次のカードは、この {cardName(card.rank)} より大きい？小さい？（同じ数字は負け）</p>
          )}
        </div>
      </div>
      <div className="row">
        <button className="btn primary big-btn" disabled={hi === 0} onClick={() => guess('high')}>
          ハイ ▲（×{hi || '-'}）
        </button>
        <button className="btn primary big-btn" disabled={lo === 0} onClick={() => guess('low')}>
          ロー ▼（×{lo || '-'}）
        </button>
        {pot > 0 && (
          <button className="btn big-btn" onClick={take}>
            受け取る（{yen(pot)}）
          </button>
        )}
      </div>
      {pot === 0 && <BetInput value={bet} onChange={setBet} />}
      <p className="muted">倍率は当たりやすさから決まります（還元率 95%）。</p>
    </div>
  );
}
