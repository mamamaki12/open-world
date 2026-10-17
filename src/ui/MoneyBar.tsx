// 上のバーに出す所持金・日付・相場と、不動産屋の入り口・カジノへ行くボタン
import { useEffect, useMemo } from 'react';
import { yen } from '../economy/money';
import { renovationCost } from '../economy/pricing';
import { saveEconomy, useCurrentLot, useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { onlineWorld } from '../session/gate';
import { clockLabel } from '../world/climate';
import { useClimate } from '../world/Climate.tsx';

export function MoneyBar() {
  const money = useEconomy((s) => s.money);
  const day = useEconomy((s) => s.day);
  const market = useEconomy((s) => s.market);
  const history = useEconomy((s) => s.marketHistory);
  const setOverlay = useGame((s) => s.setOverlay);
  const climate = useClimate();
  const prev = history.length > 1 ? history[history.length - 2] : market;
  const trend = market > prev ? 'up' : market < prev ? 'down' : '';
  return (
    <div className="moneybar">
      <div className="money" title="所持金">
        <span className={`cash${money < 0 ? ' minus' : ''}`}>{yen(money)}</span>
        <span className="sub">
          {day}日目 ・ 相場 <b className={trend}>{market.toFixed(2)}{trend === 'up' ? '▲' : trend === 'down' ? '▼' : ''}</b> ・ {clockLabel(climate)}
        </span>
      </div>
      <button className="tool" onClick={(e) => { e.currentTarget.blur(); setOverlay('map'); }} title="町の地図（M キー）。持っている土地へワープできます">
        🗺 地図
      </button>
      <button className="tool" onClick={(e) => { e.currentTarget.blur(); setOverlay('jobs'); }} title="バイトで働いてお金をかせぐ">
        💼 バイト
      </button>
      <BuildChip />
    </div>
  );
}

/** 工事中の表示、または設計を変えたときの「着工」ボタン */
export function BuildChip() {
  const lot = useCurrentLot();
  const house = useGame((s) => s.house);
  const est = useMemo(() => (lot ? renovationCost(lot.built, house) : null), [lot?.built, house]);
  if (onlineWorld()) return <span className="chip">共同建築 · 着工無料</span>;
  if (!lot) {
    return (
      <span className="chip warn">土地は不動産屋で購入できます</span>
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
    <span className="chip go" title="不動産屋の店舗で着工できます">🔨 設計変更あり（不動産屋で無料着工）</span>
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


