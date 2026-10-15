import { useEconomy, plotOffset, plotOffsetZ } from './economy';
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
