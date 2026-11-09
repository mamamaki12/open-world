// 歩く画面（照準）で、自分の土地以外（空き区画・町の家）を狙って置くと、その土地が編集先になって置ける
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const out = 'browser-checks/build-anywhere'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(120000); page.on('pageerror', e => errors.push(e.message));
  await page.goto((process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/') + '?touch=0&play=1');
  await page.waitForFunction(() => !!window.__ow);
  /** 区画 plot の中（土地の手前から 4m・横の真ん中）に立ち、下を向いて照準で床を1マス置く */
  const placeOn = async (plot, name) => {
    await page.evaluate(async plot => {
      const e = await import('/src/state/economy.ts'), { GRID, LOT_W, LOT_D } = await import('/src/building/dimensions.ts');
      const { playerMemory } = await import('/src/world/Player.tsx');
      e.useEconomy.setState({ tick: () => {} });
      const g = window.__ow.game.getState(); g.setOverlay(null); g.setMode('walk'); window.__ow.game.setState({ view: 'first' }); g.setTool('floor');
      Object.assign(playerMemory, { x: e.plotOffset(plot) + LOT_W * GRID / 2 + 0.3, y: 0, z: e.plotOffsetZ(plot) + LOT_D * GRID - 4.3, yaw: 0, bodyYaw: 0, pitch: -0.9 });
    }, plot);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${name}-aim.png` });
    const label = await page.evaluate(async () => (await import('/src/state/controls.ts')).useAim.getState().label);
    await page.evaluate(async () => (await import('/src/state/controls.ts')).aimActions.place());
    await page.waitForFunction(id => window.__ow.economy.getState().currentLotId === id, 'town-' + plot);
    await page.waitForFunction(() => window.__ow.game.getState().house.floors.some(f => f.level === 0 && f.x1 - f.x0 === 1), null, { timeout: 30000 }).catch(() => {});
    const r = await page.evaluate(() => {
      const s = window.__ow.economy.getState(), lot = s.lots.find(l => l.id === s.currentLotId);
      return { town: lot.town, name: lot.name, single: window.__ow.game.getState().house.floors.filter(f => f.x1 - f.x0 === 1 && f.z1 - f.z0 === 1).length };
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${out}/${name}-placed.png` });
    return { label, ...r };
  };
  const vacant = await page.evaluate(async () => {
    const { TOWN_HOUSE_PLOTS, FIRST_PLOT, LAST_PLOT } = await import('/src/economy/town.ts');
    const s = window.__ow.economy.getState(), used = new Set([...s.lots.flatMap(l => [l.plot, l.joined]), ...s.offers.map(o => o.plot)]);
    for (let p = FIRST_PLOT; p <= LAST_PLOT; p++) if (!TOWN_HOUSE_PLOTS[p] && !used.has(p)) return p;
    return null;
  });
  if (vacant !== null) {
    const r = await placeOn(vacant, 'vacant');
    assert.equal(r.label, 'みんなの土地に置く'); assert.equal(r.town, true); assert.equal(r.name, 'みんなの土地'); assert.equal(r.single, 1);
  }
  const r = await placeOn(2, 'town-house');
  assert.equal(r.label, '町の家に置く'); assert.equal(r.town, true); assert.ok(r.single >= 1, 'floor placed on the town house plot');
  assert.deepEqual(errors, []);
  console.log('build anywhere ok', { vacant });
} finally { await browser.close(); }
