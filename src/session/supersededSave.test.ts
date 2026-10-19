import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('./database', () => ({ readSave: vi.fn(async () => undefined), writeSave: vi.fn(async () => {}) }));
import { initializeSave, persist } from './saves';
import { writeSave } from './database';
import { sessionGate } from './gate';
import { useEconomy } from '../state/economy';

afterEach(() => { sessionGate.superseded = false; });
describe('a replaced browser cannot overwrite the active browser save', () => {
  it('skips both queued and subsequent saves after replacement', async () => {
    sessionGate.superseded = false;
    await initializeSave();
    const before = vi.mocked(writeSave).mock.calls.length;
    const queued = persist();
    sessionGate.superseded = true;
    await queued;
    useEconomy.setState({ money: 123 });
    await persist();
    expect(vi.mocked(writeSave).mock.calls).toHaveLength(before);
  });
});
