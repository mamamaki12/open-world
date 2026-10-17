import { describe, expect, it } from 'vitest';
import { settleWallet, startWallet, validWallet, walletMoney } from './wallet';

describe('common wallet journal', () => {
  it('uses the personal balance once instead of adding both wallets', () => {
    const w = startWallet('town', 1000000, 20000000, 'migration');
    expect(walletMoney(w)).toBe(20000000);
    const done = settleWallet(w, 20000000, new Set(['migration']));
    expect(done.pending).toEqual([]);
    expect(walletMoney(settleWallet(done, 20000000, new Set()))).toBe(20000000);
  });
  it('also migrates a personal balance smaller than the old shared balance', () => {
    const w = startWallet('town', 8000, 3000, 'migration');
    expect(w.pending[0].delta).toBe(-5000); expect(walletMoney(w)).toBe(3000);
  });
  it('reconciles accepted receipts after a lost acknowledgement without replaying money', () => {
    const w = startWallet('town', 1000, 1000, 'unused');
    w.pending.push({ id: 'spent', delta: -200, label: '服' }, { id: 'offline', delta: 500, label: '仕事' });
    const reloaded = JSON.parse(JSON.stringify(w));
    const next = settleWallet(reloaded, 800, new Set(['spent']));
    expect(walletMoney(next)).toBe(1300); expect(next.pending.map(p => p.id)).toEqual(['offline']);
    expect(walletMoney(settleWallet(next, 1300, new Set(['offline'])))).toBe(1300);
  });
  it('includes server income while offline deltas remain pending', () => {
    const w = startWallet('town', 1000, 1000, 'unused');
    w.pending.push({ id: 'cost', delta: -100, label: '維持費' });
    expect(walletMoney(settleWallet(w, 1500, new Set()))).toBe(1400);
  });
  it('rejects malformed journals while accepting a saved pending migration', () => {
    const w = startWallet('town', 100, 200, 'm'); expect(validWallet(w)).toBe(true);
    expect(validWallet({ ...w, pending: [...w.pending, ...w.pending] })).toBe(false);
    expect(validWallet({ ...w, balance: Infinity })).toBe(false);
    expect(validWallet({ ...w, pending: [{ id: 'x', delta: NaN, label: 'x' }] })).toBe(false);
  });
});
