import type { Lot } from '../state/economy';
import type { WorldSave } from './saves';

/** サーバーのcurrentLotIdは全員共通。入場する人の編集先には流用しない。 */
export function initialEditingLot(lots: Lot[], local: string | null, fallback: string | null, me: string): string | null {
  const current = lots.find(l => l.id === local);
  return (current?.owner === me ? current : lots.find(l => l.owner === me) ?? current)?.id ?? fallback;
}

export type PurchaseTarget = { plot: number } | { lot: string };
/** 購入を送った本人の確定記録と所有者・対象がすべて一致してから切り替える。 */
export function confirmedPurchaseLot(world: WorldSave, command: string, target: PurchaseTarget, me: string): string | undefined {
  const receipt = world.receipts?.[command];
  if (!receipt || receipt.sender !== me || receipt.cancelled) return;
  return world.economy.lots.find(l => l.owner === me && ('plot' in target ? l.plot === target.plot : l.id === target.lot))?.id;
}
