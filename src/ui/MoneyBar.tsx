// 上のバーに出す所持金・日付・相場と、不動産屋・カジノへの入り口
import { useEffect, useMemo } from 'react';
import { yen } from '../economy/money';
import { renovationCost } from '../economy/pricing';
import { saveEconomy, useCurrentLot, useEconomy } from '../state/economy';
import { useGame } from '../state/store';

export function MoneyBar() {
  const money = useEconomy((s) => s.money);
  const day = useEconomy((s) => s.day);
  const market = useEconomy((s) => s.market);
  const history = useEconomy((s) => s.marketHistory);
  const setOverlay = useGame((s) => s.setOverlay);
  const prev = history.length > 1 ? history[history.length - 2] : market;
  const trend = market > prev ? 'up' : market < prev ? 'down' : '';
  return (
    <div className="moneybar">
      <div className="money" title="所持金">
        <span className={`cash${money < 0 ? ' minus' : ''}`}>{yen(money)}</span>
        <span className="sub">
          {day}日目 ・ 相場 <b className={trend}>{market.toFixed(2)}{trend === 'up' ? '▲' : trend === 'down' ? '▼' : ''}</b>
        </span>
      </div>
      <button className="tool" onClick={(e) => { e.currentTarget.blur(); setOverlay('estate'); }}>
        🏠 不動産
      </button>
      <button className="tool" onClick={(e) => { e.currentTarget.blur(); setOverlay('casino'); }}>
        🎰 カジノ・競技場
      </button>
      <BuildChip />
    </div>
  );
}

/** 工事中の表示、または設計を変えたときの「着工」ボタン */
export function BuildChip() {
  const lot = useCurrentLot();
  const house = useGame((s) => s.house);
  const setOverlay = useGame((s) => s.setOverlay);
  const est = useMemo(() => (lot ? renovationCost(lot.built, house) : null), [lot?.built, house]);
  if (!lot) {
    return (
      <button className="tool chip warn" onClick={() => setOverlay('estate')}>
        土地がありません → 土地を買う
      </button>
    );
  }
  if (lot.construction) {
    const c = lot.construction;
    const pct = Math.round((1 - c.remaining / c.total) * 100);
    return (
      <span className="chip building" title="工事が終わるまで待つ間に、バイトやカジノができます">
        🏗 工事中 {pct}%（あと{Math.ceil(c.remaining)}秒）
      </span>
    );
  }
  if (!est || est.parts === 0) return null;
  return (
    <button className="tool chip go" onClick={() => setOverlay('estate')} title="設計はタダ。着工したときに工事費を払います">
      🔨 {lot.built ? '改築' : '着工'} {yen(est.total)}
    </button>
  );
}

/** お金の時計を進め、こまめに保存する */
export function useEconomyClock() {
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      // タブが裏に回っていた間は進めない（最大2秒ぶんだけ）
      const dt = Math.min((now - last) / 1000, 2);
      last = now;
      useEconomy.getState().tick(dt);
    }, 250);
    const save = setInterval(saveEconomy, 3000);
    const onHide = () => saveEconomy();
    window.addEventListener('beforeunload', onHide);
    return () => {
      clearInterval(id);
      clearInterval(save);
      window.removeEventListener('beforeunload', onHide);
    };
  }, []);
}

