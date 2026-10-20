import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { waitForCondition } from './wait-condition.mjs';
const waitCondition = (page, predicate, arg) => waitForCondition(page, predicate, arg, 30000);

const base = process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/';
const out = 'browser-checks/bulk-selection';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const profiles = [{ name: 'pc', width: 1280, height: 800, touch: false },
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'small-phone', width: 320, height: 568, touch: true }];
try {
  for (const profile of profiles.filter(p => !process.argv[2] || p.name === process.argv[2])) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: 1, hasTouch: profile.touch, isMobile: profile.touch });
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const cdp = profile.touch ? await context.newCDPSession(page) : null;
    const undo = async () => {
      if (profile.touch) await page.getByRole('button', { name: '取り消し', exact: true }).click();
      else await page.getByTitle('Ctrl+Z', { exact: true }).click();
      // Wait for restored meshes and the previous gesture's click suppression.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForTimeout(200);
    };
    const state = () => page.evaluate(() => {
      const g = window.__ow.game.getState(); return { marked: g.marked.map(r => r.id).sort(), selection: g.selection?.id, floors: g.house.floors, furniture: g.house.furniture,
        past: g.past.length, box: g.boxSelect, camera: window.__ow.camera.position.toArray(), mode: g.mode };
    });
    const project = async (x, y, z) => page.evaluate(({ x, y, z }) => window.__ow.project(x, y, z), { x, y, z });
    const drag = async (a, b, hold = 0) => {
      if (profile.touch) {
        const point = p => ({ x: p.x, y: p.y, radiusX: 2, radiusY: 2 });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(a)] });
        if (hold) await page.waitForTimeout(hold);
        for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point({ x: a.x + (b.x - a.x) * i / 6, y: a.y + (b.y - a.y) * i / 6 })] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(a.x, a.y); await page.mouse.down();
        if (hold) await page.waitForTimeout(hold);
        await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up();
      }
      await page.waitForTimeout(250);
    };
    const seed = async () => {
      await page.evaluate(async () => {
        const { emptyHouse } = await import('/src/building/types.ts');
        const { useInteraction } = await import('/src/state/interaction.ts');
        const g = window.__ow.game.getState();
        g.setMode('build'); g.setOverlay(null); g.setTool('select');
        window.__ow.game.setState({ house: { ...emptyHouse(), floors: [
          { id: 'qa-a', level: 0, x0: 8, z0: 7, x1: 10, z1: 9, finish: { material: 'flooring', color: '#c8a57a' } },
          { id: 'qa-b', level: 0, x0: 12, z0: 7, x1: 14, z1: 9, finish: { material: 'flooring', color: '#815c43' } },
          { id: 'qa-outside', level: 0, x0: 17, z0: 14, x1: 19, z1: 16, finish: { material: 'flooring', color: '#c8a57a' } }],
          furniture: [{ id: 'qa-chair', type: 'chair', level: 0, x: 8.2, z: 7.3, rotation: 0, color: '#a77b52' }] },
          past: [], future: [], selection: null, marked: [], groupSelection: false, boxSelect: false, dragBase: null });
        useInteraction.setState({ buildingDrag: null, furnitureDrag: null, preview: null, ignorePartClickUntil: 0 });
      });
      await frame();
    };
    const frame = async () => {
      await page.evaluate(async () => {
        const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
        const s = _roots.get(document.querySelector('canvas')).store.getState();
        s.controls.target.set(10, 0, 8); s.camera.position.set(10, 24, 8.001); s.camera.lookAt(s.controls.target);
        s.controls.update(); s.camera.updateMatrixWorld(); s.scene.updateMatrixWorld(true);
      });
      await page.waitForTimeout(700);
    };
    try {
      await page.goto(`${base}?play=1&touch=${profile.touch ? 1 : 0}`);
      await page.waitForFunction(() => window.__ow?.scene && window.__ow?.game);
      await seed();
      console.log(`${profile.name}: seeded`);
      await page.getByRole('button', { name: '範囲選択', exact: true }).click();
      await page.waitForTimeout(600);
      const before = await state();
      await drag(await project(7 * .91, 0, 6 * .91), await project(15 * .91, 0, 10 * .91));
      await waitCondition(page, () => window.__ow.game.getState().marked.length === 3);
      assert.deepEqual((await state()).marked, ['qa-a', 'qa-b', 'qa-chair']);
      console.log(`${profile.name}: range selected`);
      assert(Math.hypot(...(await state()).camera.map((v, i) => v - before.camera[i])) < .1, 'range selection must not rotate the camera');
      await page.screenshot({ path: `${out}/${profile.name}-selected.png` });
      await page.getByRole('button', { name: '移動・編集', exact: true }).click();
      await page.waitForTimeout(600);
      await drag(await project(13 * .91, .5, 8 * .91), await project(14 * .91, .5, 9 * .91), 700);
      const moved = await state();
      assert.equal(moved.floors.find(p => p.id === 'qa-a').x0, 9, 'arbitrary mixed selection moves together');
      assert.equal(moved.floors.find(p => p.id === 'qa-b').z0, 8);
      assert.equal(moved.floors.length, 3, 'holding a grouped drag must not delete');
      assert(Math.abs(moved.furniture[0].x - 9.11) < .01);
      assert.equal(moved.past, 1);
      console.log(`${profile.name}: held drag moved`);
      await page.screenshot({ path: `${out}/${profile.name}-moved.png` });
      await page.getByRole('button', { name: '選択を削除', exact: true }).click();
      assert.deepEqual((await state()).floors.map(p => p.id), ['qa-outside']);
      assert.equal((await state()).furniture.length, 0);
      await undo();
      assert.equal((await state()).floors.length, 3);
      await undo();
      assert.equal((await state()).floors.find(p => p.id === 'qa-a').x0, 8);
      await page.screenshot({ path: `${out}/${profile.name}-undo.png` });

      if (!profile.touch) {
        await page.keyboard.down('Shift');
        await drag(await project(8.5 * .91, .5, 7.5 * .91), await project(14.5 * .91, 0, 9.5 * .91));
        await page.keyboard.up('Shift');
        assert.deepEqual((await state()).marked, ['qa-a', 'qa-b', 'qa-chair']);
        await page.getByRole('button', { name: '選び直す', exact: true }).click();
        assert.deepEqual((await state()).marked, []);
      }

      // Switching modes must not leave the previous range gesture active on UI clicks.
      await seed();
      const a = await project(8.5 * .91, .5, 7.5 * .91);
      if (profile.touch) await page.touchscreen.tap(a.x, a.y); else await page.mouse.click(a.x, a.y);
      await waitCondition(page, () => window.__ow.game.getState().selection?.id === 'qa-a');
      const grouping = page.getByRole('checkbox', { name: '同じ素材・色をまとめて移動' });
      await grouping.check(); await page.waitForTimeout(200);
      assert.deepEqual((await state()).marked, [], 'checkbox must not revive a previous range');
      await drag(a, a, 700);
      assert.equal((await state()).floors.length, 3, 'same-material hold preserves parts');
      await page.getByRole('button', { name: '→ 1マス', exact: true }).click();
      assert.equal((await state()).floors.find(p => p.id === 'qa-a').x0, 9);
      assert.equal((await state()).floors.find(p => p.id === 'qa-outside').x0, 18);
      assert.equal((await state()).floors.find(p => p.id === 'qa-b').x0, 12);
      await undo();
      if (profile.touch) await page.touchscreen.tap(a.x, a.y); else await page.mouse.click(a.x, a.y);
      await waitCondition(page, () => window.__ow.game.getState().selection?.id === 'qa-a');
      await grouping.uncheck();
      await drag(a, a, 700);
      await waitCondition(page, () => !window.__ow.game.getState().house.floors.some(p => p.id === 'qa-a'));

      // Test the deletion tool's own range and its visible confirmation controls.
      await seed();
      await page.evaluate(() => { const g = window.__ow.game.getState(); g.setTool('erase'); g.setEraseMulti(true); });
      await frame();
      await drag(await project(7 * .91, 0, 6 * .91), await project(15 * .91, 0, 10 * .91));
      await waitCondition(page, () => window.__ow.game.getState().marked.length === 3);
      await page.getByRole('button', { name: /まとめて削除/ }).click();
      assert.deepEqual((await state()).floors.map(p => p.id), ['qa-outside']);
      await undo();
      assert.equal((await state()).floors.length, 3);

      // Walk away, turn, then enter construction using the real mode button.
      await seed();
      const playerBefore = await page.evaluate(() => { const g = window.__ow.game.getState(); g.setMode('walk'); Object.assign(window.__ow.player, { x: 70, y: .5, z: -40, yaw: Math.PI / 2, bodyYaw: Math.PI / 2 }); return { ...window.__ow.player }; });
      await page.waitForTimeout(500);
      if (profile.touch) {
        await page.getByRole('button', { name: 'メニュー', exact: true }).click();
        await page.getByRole('button', { name: /建築に戻る/ }).click();
      } else await page.getByRole('button', { name: /建築モード|建てる|建築に戻る/ }).first().click();
      await waitCondition(page, () => window.__ow.game.getState().mode === 'build');
      const camera = (await state()).camera;
      assert(Math.hypot(camera[0] - playerBefore.x, camera[2] - playerBefore.z) < 20, 'build camera stays near the current player');
      await page.screenshot({ path: `${out}/${profile.name}-camera-entry.png` });
      assert.deepEqual(errors, []);
      results.push({ profile: profile.name, status: 'passed', errors });
      console.log(`${profile.name}: range, held drag, delete/undo, checkbox, single long press, erase range, camera passed`);
    } catch (error) {
      await page.screenshot({ path: `${out}/${profile.name}-failure.png` }).catch(() => {});
      console.error(profile.name, await state().catch(() => null)); throw error;
    } finally { await context.close(); }
  }
} finally { fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2)); await browser.close(); }
