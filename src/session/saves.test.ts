import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('./database', () => ({ readSave: vi.fn(async () => undefined), writeSave: vi.fn(async (_data: unknown) => {}) }));
import { applyWorld, initializeSave, importSave, persist, snapshot, validBundle } from './saves';
import { useGame } from '../state/store';
import { sessionGate } from './gate';
import { originShift } from '../state/economy';
import { plotX, plotZ } from '../economy/town';
import { writeSave } from './database';
import { useEconomy } from '../state/economy';
import { useLooks } from '../state/looks';
import { useStocks } from '../state/stocks';
import { useDesigns, TEMPLATES } from '../catalog/designs';
const eco = useEconomy.getState(), looks = useLooks.getState(), stocks = useStocks.getState(), designs = useDesigns.getState();
beforeEach(async () => { vi.mocked(writeSave).mockClear(); await initializeSave(); });
afterEach(() => { useEconomy.setState(eco); useLooks.setState(looks); useStocks.setState(stocks); useDesigns.setState(designs); });
it('restores appearance, home holdings and unplaced furniture designs from a backup', async () => {
  useLooks.getState().set({ ...looks.looks, sex: 'f', hair: 'pony', hairColor: 4 });
  useStocks.setState({ holdings: { test: { units: 2, cost: 100 } } });
  useDesigns.getState().save({ ...TEMPLATES[1].def, id: 'design:backup-test' });
  const b = snapshot();
  useLooks.setState(looks); useStocks.setState({ holdings: {} }); useDesigns.setState({ designs: [] });
  await importSave(JSON.stringify(b));
  expect(useLooks.getState().looks).toMatchObject({ sex: 'f', hair: 'pony', hairColor: 4 });
  expect(useStocks.getState().holdings).toEqual({ test: { units: 2, cost: 100 } });
  expect(useDesigns.getState().designs.some(d => d.id === 'design:backup-test')).toBe(true);
});
it('accepts legacy backups without erasing personal data added by newer versions', async () => {
  const { appearance: _a, holdings: _h, designs: _d, ...legacy } = snapshot();
  useLooks.getState().set({ ...looks.looks, hair: 'pony' });
  useStocks.setState({ holdings: { test: { units: 1, cost: 100 } } });
  expect(validBundle(legacy)).toBe(true);
  await importSave(JSON.stringify(legacy));
  expect(useLooks.getState().looks.hair).toBe('pony');
  expect(useStocks.getState().holdings.test.units).toBe(1);
  expect(validBundle({ ...legacy, holdings: { test: { units: -1, cost: 100 } } })).toBe(false);
});
it('does not let pending or concurrent autosaves overwrite an imported backup', async () => {
  let unblock!: () => void, entered!: () => void;
  const blocked = new Promise<void>(r => { unblock = r; }), started = new Promise<void>(r => { entered = r; });
  useEconomy.setState({ money: 999 }); const imported = snapshot();
  useEconomy.setState({ money: 100 });
  vi.mocked(writeSave).mockImplementationOnce(async () => { entered(); await blocked; });
  const oldSave = persist(); await started;
  const importing = importSave(JSON.stringify(imported));
  const autosave = persist();
  unblock(); await Promise.all([oldSave, importing, autosave]);
  expect(useEconomy.getState().money).toBe(999);
  expect(vi.mocked(writeSave).mock.calls.at(-1)![0]).toMatchObject({ profile: { money: 999 } });
});
it('keeps the current game when import storage fails and allows subsequent saves', async () => {
  useEconomy.setState({ money: 999 }); const imported = snapshot();
  useEconomy.setState({ money: 100 });
  vi.mocked(writeSave).mockRejectedValueOnce(Error('disk full'));
  await expect(importSave(JSON.stringify(imported))).rejects.toThrow('disk full');
  expect(useEconomy.getState().money).toBe(100);
  await persist();
  expect(vi.mocked(writeSave).mock.calls.at(-1)![0]).toMatchObject({ profile: { money: 100 } });
});

it('loads the confirmed personal lot house and shifts the origin without changing town position',()=>{
  const w=snapshot().home,first=w.economy.lots[0],mine={...first,id:'my-second-lot',plot:1,design:{...w.house,furniture:[]}};
  w.economy.lots=[{...first,plot:0},mine];w.economy.currentLotId=first.id;
  applyWorld(w);const previous=sessionGate.shared,listener=originShift.listener,shift=vi.fn();sessionGate.shared=true;originShift.listener=shift;
  try{
    applyWorld(w,true,mine.id);
    expect(useEconomy.getState().currentLotId).toBe(mine.id);
    expect(useGame.getState().house).toEqual(mine.design);
    expect(shift).toHaveBeenCalledWith(plotX(0)-plotX(1),plotZ(0)-plotZ(1));
    // Normal snapshots must preserve the explicit local selection, even when viewing another owner.
    applyWorld(w,true,first.id);shift.mockClear();applyWorld(w,true);
    expect(useEconomy.getState().currentLotId).toBe(first.id);expect(shift).not.toHaveBeenCalled();
  }finally{sessionGate.shared=previous;originShift.listener=listener;}
});
