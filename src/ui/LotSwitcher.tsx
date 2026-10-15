import { useEconomy } from '../state/economy';
import { editOwnedLot } from '../world/Player';

export function LotSwitcher() {
  const lots = useEconomy((s) => s.lots);
  const current = useEconomy((s) => s.currentLotId);
  if (lots.length < 2) return null;
  const name = lots.find(lot => lot.id === current)?.name.replace(/（.*）$/, '') ?? '未選択';
  return <select className="tool" aria-label="編集する家" title="所有する家を選んで建築・編集します"
    style={{ maxWidth: 190, minWidth: 0 }} value="" onChange={(e) => { editOwnedLot(e.target.value); e.currentTarget.blur(); }}>
    <option value="" disabled>編集する家：{name}</option>
    {lots.map(lot => <option key={lot.id} value={lot.id}>{lot.id === current ? '✓ ' : ''}{lot.name}</option>)}
  </select>;
}
