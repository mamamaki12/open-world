// 土地を買うとき、隣の自分の土地とつなげるかどうかのチェック
import { ownedNeighbor, useEconomy } from '../state/economy';

export function JoinOption({ plot, checked, onChange }: { plot: number | undefined; checked: boolean; onChange: (v: boolean) => void }) {
  const neighbor = useEconomy((s) => ownedNeighbor(s.lots, plot));
  if (!neighbor) return null;
  return (
    <label className="join-option">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      隣の「{neighbor.name.replace(/（.*）$/, '')}」とつなげて、1つの広い土地にする
      <small className="muted">（間の通路も土地になり、横に約2倍の家が建てられます）</small>
    </label>
  );
}
