import { iconText } from './AppIcon';
// 上のバーに出す所持金・日付・相場と、工事・設計変更の表示
import { useEffect, useMemo } from 'react';
import { yen } from '../economy/money';
import { renovationCost } from '../economy/pricing';
import { saveEconomy, useCurrentLot, useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { onlineWorld, sessionGate } from '../session/gate';
import { savedBundle } from '../session/saves';
import { clockLabel } from '../world/climate';
import { useClimate } from '../world/Climate.tsx';

/** PC の上のバーの左端：所持金と、日付・相場・時刻 */
export function MoneyStatus() {
  const money = useEconomy((s) => s.money);
  const day = useEconomy((s) => s.day);
  const market = useEconomy((s) => s.market);
  const history = useEconomy((s) => s.marketHistory);
  const climate = useClimate();
  const prev = history.length > 1 ? history[history.length - 2] : market;
  const trend = market > prev ? 'up' : market < prev ? 'down' : '';
  return (
    <div className="money" title="所持金">
      <span className={`cash${money < 0 ? ' minus' : ''}`}>{yen(money)}</span>
      <span className="sub">
        {day}日目 ・ 相場 <b className={trend}>{market.toFixed(2)}{iconText(trend === 'up' ? '▲' : trend === 'down' ? '▼' : '')}</b> ・ {iconText(clockLabel(climate))}
      </span>
    </div>
  );
}

/** 工事中の表示、または設計を変えたときの「着工」ボタン */
export function BuildChip() {
  const lot = useCurrentLot();
  const house = useGame((s) => s.house);
  const est = useMemo(() => (lot ? renovationCost(lot.built, house) : null), [lot?.built, house]);
  if (sessionGate.shared) {
    if (!lot) return <span className="chip warn">土地は不動産屋で購入できます</span>;
    const me = savedBundle().profile.id;
    return <span className="chip">{lot.name} · {!lot.owner || lot.owner === me ? 'あなたの土地' : `${lot.ownerName || 'ほかの人'}さんの土地`} · 着工無料</span>;
  }
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
      <span className="chip building" title="工事が終わるまで待つ間に、バイトやカジノができます">{iconText("🏗 工事中 ")}{pct}%（あと{Math.ceil(c.remaining)}秒）
      </span>
    );
  }
  if (!est || est.parts === 0) return null;
  return (
    <span className="chip go" title="不動産屋の店舗で着工できます">{iconText("🔨 設計変更あり（不動産屋で無料着工）")}</span>
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


