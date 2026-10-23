// ほかの人の土地の家でも、床に上がれてドアのボタンが出る（PC・スマホ）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const out = 'browser-checks/others-house-walk'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const errors = [];
async function until(page, fn, arg) {
  for (const end = Date.now() + 60000; Date.now() < end; await page.waitForTimeout(100)) if (await page.evaluate(fn, arg)) return;
  throw Error('timed out: ' + fn);
}
try {
  for (const [name, viewport, touch] of [['pc', { width: 1280, height: 800 }, 0], ['phone', { width: 844, height: 390 }, 1]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
    await page.goto((process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/') + `?touch=${touch}&play=1`);
    await page.waitForFunction(() => !!window.__ow);
    const door = await page.evaluate(async () => {
      const { sampleHouse } = await import('/src/building/sample.ts'), { emptyHouse } = await import('/src/building/types.ts');
      const { GRID } = await import('/src/building/dimensions.ts'), e = await import('/src/state/economy.ts');
      const lot = (id, plot, built) => ({ id, owner: id, plot, name: id, location: 'rural', variance: 1, built, design: null, construction: null, rented: false, invested: 0 });
      const house = sampleHouse();
      e.useEconomy.setState({ tick: () => {}, lots: [lot('me', 0, emptyHouse()), lot('friend', 1, house)], currentLotId: 'me', offers: [] });
      window.__ow.game.setState({ house: emptyHouse(), overlay: null });
      window.__ow.game.getState().setMode('walk');
      const ox = e.plotOffset(1), oz = e.plotOffsetZ(1);
      Object.assign(window.__ow.player, { x: ox + 6 * GRID + 7.735 + 0.4, z: oz + 14 * GRID + 0.7, y: 0 });
      return { id: house.openings.find(o => o.type === 'entrance').id, ox, oz, GRID };
    });
    const doors = '/src/state/doors.ts';
    await until(page, async d => (await import(d)).useDoors.getState().target !== null, doors);
    assert.equal(await page.evaluate(async d => (await import(d)).useDoors.getState().target, doors), door.id, 'entrance door is targeted');
    await page.screenshot({ path: `${out}/${name}-door.png` });
    if (touch) await page.getByRole('button', { name: 'ドアを開ける' }).click();
    else await page.keyboard.press('KeyF');
    await until(page, async ([d, id]) => id in (await import(d)).useDoors.getState().open, [doors, door.id]);
    // 床の上に置くと、その家の床の高さに立つ
    await page.evaluate(({ ox, oz, GRID }) => Object.assign(window.__ow.player, { x: ox + 9 * GRID, z: oz + 10 * GRID, y: 1 }), door);
    await page.waitForTimeout(1500);
    const y = await page.evaluate(() => window.__ow.player.y);
    assert.ok(y > 0.05, 'stands on the floor of the other house: y=' + y);
    await page.screenshot({ path: `${out}/${name}-inside.png` });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('others house walk ok');
} finally { await browser.close(); }
