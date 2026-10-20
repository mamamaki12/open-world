/** waitForFunction treats an async predicate's Promise as truthy; await its resolved value instead. */
export async function waitForCondition(page, predicate, arg, timeout = 120000) {
  for (const end = Date.now() + timeout; Date.now() < end; await page.waitForTimeout(100)) {
    if (await page.evaluate(predicate, arg)) return;
  }
  throw Error('Condition timed out: ' + predicate);
}
