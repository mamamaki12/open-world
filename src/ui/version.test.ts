import { afterEach, expect, it, vi } from 'vitest';
import { compareBuild, fetchLatestBuild, validBuild } from './version';

const current = { id: 'first', version: '1.0.0', builtAt: '2026-10-19T10:00:00Z' };
afterEach(() => vi.unstubAllGlobals());
it('recognizes exactly the running published build', () => {
  expect(compareBuild(current, { ...current }).status).toBe('current');
});
it('detects a newer deployment, including rebuilding the same source revision', () => {
  expect(compareBuild(current, { ...current, id: 'rebuild', builtAt: '2026-10-19T10:01:00Z' }).status).toBe('update');
});
it('does not claim to be latest or outdated from an older or conflicting response', () => {
  for (const builtAt of ['2026-10-19T09:00:00Z', current.builtAt]) {
    expect(compareBuild(current, { ...current, id: 'other', builtAt }).status).toBe('unavailable');
  }
});
it('rejects missing, malformed and invalid release metadata', () => {
  for (const value of [null, {}, { ...current, builtAt: 'invalid' }, { ...current, id: '' }, { ...current, version: 42 }]) expect(validBuild(value)).toBe(false);
  expect(validBuild(current)).toBe(true);
});
it('checks the same app directory with HTTP cache bypass and the supplied abort signal', async () => {
  vi.stubGlobal('document', { baseURI: 'https://example.test/open-world/index.html' });
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => current });
  vi.stubGlobal('fetch', fetcher);
  const controller = new AbortController();
  expect(await fetchLatestBuild(controller.signal)).toEqual(current);
  const [url, options] = fetcher.mock.calls[0];
  expect(url.pathname).toBe('/open-world/version.json'); expect(url.searchParams.has('check')).toBe(true);
  expect(options.cache).toBe('no-store'); expect(options.signal).toBe(controller.signal);
});
it('does not treat error pages or malformed metadata as a successful check', async () => {
  vi.stubGlobal('document', { baseURI: 'https://example.test/open-world/' });
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetcher);
  for (let i = 0; i < 2; i++) await expect(fetchLatestBuild(new AbortController().signal)).rejects.toThrow();
});
