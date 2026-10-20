import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForCondition } from './wait-condition.mjs';
test('a resolved false Promise does not pass the browser readiness check', async () => {
  let calls = 0;
  const page = { evaluate: fn => fn(), waitForTimeout: async () => {} };
  await waitForCondition(page, async () => { await Promise.resolve(); return ++calls === 3; });
  assert.equal(calls, 3);
});
test('an async predicate which stays false times out instead of passing', async () => {
  const page = { evaluate: fn => fn(), waitForTimeout: ms => new Promise(r => setTimeout(r, ms)) };
  await assert.rejects(waitForCondition(page, async () => false, undefined, 5), /Condition timed out/);
});
