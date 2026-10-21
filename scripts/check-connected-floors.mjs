import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'browser-checks/connected-floors';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const touch of [false, true]) {
    const name = touch ? 'phone' : 'pc';
    const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${process.env.WORLD_TEST_URL || 'http://127.0.0.1:5173/'}?play=1&touch=${Number(touch)}`);
      await page.waitForFunction(() => window.__ow?.game && window.__ow?.scene);
      await page.evaluate(async () => {
        const { emptyHouse } = await import('/src/building/types.ts');
        const g = window.__ow.game.getState(); g.setMode('build'); g.setOverlay(null); g.setTool('floor');
        const finish = { material: 'flooring', color: '#c8a57a' };
        window.__ow.game.setState({ house: { ...emptyHouse(),
          walls: [{ id: 'support', level: 0, x0: 8, x1: 8, z0: 6, z1: 8, exterior: finish, interior: finish }],
          floors: [{ id: 'root', level: 1, x0: 8, x1: 10, z0: 6, z1: 8, finish }] }, past: [], future: [], selection: null, marked: [] });
        const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
        const s = _roots.get(document.querySelector('canvas')).store.getState();
        s.controls.target.set(10, 0, 6.5); s.camera.position.set(10, 22, 6.501); s.camera.lookAt(s.controls.target); s.controls.update(); s.camera.updateMatrixWorld();
      });
      await page.waitForTimeout(1000);
      const project = (x, z) => page.evaluate(({ x, z }) => window.__ow.project(x * .91, 3.4, z * .91), { x, z });
      const cdp = touch ? await context.newCDPSession(page) : null;
      const drag = async (x0, x1) => {
        const a = await project(x0 + .2, 6.2), b = await project(x1 - .2, 7.8);
        if (touch) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
          for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / 8, y: a.y + (b.y - a.y) * i / 8 }] });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else { await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up(); }
        await page.waitForTimeout(500);
      };
      // Start ON the existing slab, not just outside its edge.
      await drag(9, 12);
      await page.waitForFunction(() => window.__ow.game.getState().house.floors.length === 2);
      await drag(11, 14);
      await page.waitForFunction(() => window.__ow.game.getState().house.floors.length === 3);
      const floors = await page.evaluate(() => window.__ow.game.getState().house.floors);
      assert.deepEqual(floors.map(({ level, x0, x1, z0, z1 }) => ({ level, x0, x1, z0, z1 })), [8, 10, 12].map(x0 => ({ level: 1, x0, x1: x0 + 2, z0: 6, z1: 8 })));
      assert.equal(floors[0].id, 'root', 'existing slab is preserved');
      // A covered gesture must neither duplicate the floor nor build an upper one.
      await drag(9, 10);
      assert.equal(await page.evaluate(() => window.__ow.game.getState().house.floors.length), 3);
      await page.screenshot({ path: `${out}/${name}-extended.png` });
      if (touch) await page.getByRole('button', { name: '取り消し', exact: true }).click();
      else await page.getByTitle('Ctrl+Z', { exact: true }).click();
      await page.waitForFunction(() => window.__ow.game.getState().house.floors.length === 2);
      assert.deepEqual(errors, []);
      results.push({ name, extensions: 2, level: 1, undo: true, errors });
      console.log(`${name}: drag from an existing floor / two extensions / no duplicate / undo passed`);
    } catch (error) { await page.screenshot({ path: `${out}/${name}-failure.png` }); throw error; }
    finally { await context.close(); }
  }
} finally { await browser.close(); await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2)); }
