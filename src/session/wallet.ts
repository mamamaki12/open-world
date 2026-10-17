/** Durable deltas already included in the displayed personal balance. IDs survive retries. */
export interface WalletPayment { id: string; delta: number; label: string }
export interface WalletSync { worldId: string; balance: number; pending: WalletPayment[] }
export const walletMoney = (w: WalletSync) => w.balance + w.pending.reduce((sum, p) => sum + p.delta, 0);
export function validWallet(v: unknown): v is WalletSync {
  if (!v || typeof v !== 'object') return false;
  const w = v as WalletSync;
  return typeof w.worldId === 'string' && Number.isSafeInteger(w.balance) && Array.isArray(w.pending) &&
    w.pending.every(p => p && typeof p.id === 'string' && p.id.length <= 120 &&
      Number.isSafeInteger(p.delta) && Math.abs(p.delta) <= 1e13 && typeof p.label === 'string' && p.label.length <= 120) &&
    new Set(w.pending.map(p => p.id)).size === w.pending.length && Number.isSafeInteger(walletMoney(w));
}
export function startWallet(worldId: string, serverMoney: number, personalMoney: number, id: string): WalletSync {
  const delta = personalMoney - serverMoney;
  return { worldId, balance: serverMoney, pending: delta ? [{ id, delta, label: '個別ワールドから所持金を引き継ぎ' }] : [] };
}
export function settleWallet(w: WalletSync, balance: number, acknowledged: ReadonlySet<string>): WalletSync {
  return { ...w, balance, pending: w.pending.filter(p => !acknowledged.has(p.id)) };
}
