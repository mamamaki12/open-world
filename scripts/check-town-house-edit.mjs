// 町に最初から建っている家を建築モードでクリックすると、その家を編集できる（ひとりで遊ぶ・PC）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const out = 'browser-checks/town-house-edit'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
  await page.goto((process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/') + '?touch=0&play=1');
  await page.waitForFunction(() => !!window.__ow);
  const plot = 2;
  const target = await page.evaluate(async plot => {
    const e = await import('/src/state/economy.ts'), { GRID, LOT_W, LOT_D } = await import('/src/building/dimensions.ts');
    const { townHouseAt } = await import('/src/building/townHouses.ts');
    e.useEconomy.setState({ tick: () => {} });
    const g = window.__ow.game.getState(); g.setMode('build'); g.setOverlay(null);
    const ox = e.plotOffset(plot), oz = e.plotOffsetZ(plot), cx = ox + LOT_W * GRID / 2, cz = oz + LOT_D * GRID / 2;
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const s = _roots.get(document.querySelector('canvas')).store.getState();
    s.controls.target.set(cx, 2, cz); s.camera.position.set(cx + 4, 22, cz + 30); s.controls.update(); s.camera.updateMatrixWorld();
    const w = townHouseAt(plot).walls.find(w => w.level === 0);
    return { x: ox + (w.x0 + w.x1) / 2 * GRID, z: oz + (w.z0 + w.z1) / 2 * GRID, house: townHouseAt(plot).walls.length };
  }, plot);
  await page.waitForTimeout(3000);
  const p = await page.evaluate(t => window.__ow.project(t.x, 1.2, t.z), target);
  await page.screenshot({ path: `${out}/before.png` });
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(id => window.__ow.economy.getState().currentLotId === id, 'town-' + plot);
  const r = await page.evaluate(() => ({ lot: window.__ow.economy.getState().lots.find(l => l.id === window.__ow.economy.getState().currentLotId), walls: window.__ow.game.getState().house.walls.length }));
  assert.equal(r.lot.town, true); assert.equal(r.walls, target.house, 'town house loaded for editing');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/editing.png` });
  // 売れない
  assert.ok(await page.evaluate(id => window.__ow.economy.getState().sell(id), 'town-' + plot));
  assert.deepEqual(errors, []);
  console.log('town house edit ok');
} finally { await browser.close(); }
