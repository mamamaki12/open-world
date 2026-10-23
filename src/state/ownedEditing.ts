import { useEconomy, plotOffset, plotOffsetZ, saveEconomy } from './economy';
import { sessionGate } from '../session/gate';
import { savedBundle } from '../session/saves';
import { townHouseLot, townLotId } from '../building/townHouses';
import { useGame } from './store';

/** UIに家の選択モードを持たせず、触れた所有物のデータへ操作を振り分ける。 */
export function activateOwnedHouse(id: string): { x: number; z: number } | null {
  const economy = useEconomy.getState();
  const lot = economy.lots.find(lot => lot.id === id);
  if (!lot) return null;
  const offset = typeof lot.plot === 'number' ? { x: plotOffset(lot.plot, economy), z: plotOffsetZ(lot.plot, economy) } : { x: 0, z: 0 };
  useGame.getState().endDrag();
  economy.switchLot(id);
  return offset;
}

/** ほかの人のお店は持ち主しか変えられない */
export function editBlocked(id: string): string | null {
  const lot = useEconomy.getState().lots.find(l => l.id === id);
  return lot?.shop && lot.owner && sessionGate.shared && lot.owner !== savedBundle().profile.id ? 'お店は持ち主しか変えられません' : null;
}

/** 町に最初から建っている家を、編集できる土地にする。土地ができたら onReady を呼ぶ（みんなのワールドではサーバーの確定を待つ） */
export function claimTownHouse(plot: number, onReady: (id: string) => void): string | null {
  const id = townLotId(plot);
  const ready = () => useEconomy.getState().lots.some(l => l.id === id);
  if (ready()) { onReady(id); return null; }
  if (sessionGate.shared) {
    const err = sessionGate.act ? sessionGate.act('', { type: 'townHouse', plot }, 0) : '接続していません';
    if (err) return err;
    const stop = useEconomy.subscribe(() => { if (ready()) { stop(); clearTimeout(timer); onReady(id); } });
    const timer = setTimeout(stop, 15000);
    return null;
  }
  const lot = townHouseLot(plot);
  if (!lot) return 'その家は編集できません';
  useEconomy.setState(s => ({ lots: [...s.lots, lot] }));
  saveEconomy();
  onReady(id);
  return null;
}
