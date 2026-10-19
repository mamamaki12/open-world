import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

// Exercise the generated worker against an HTTP cache containing the previous release.
const root = path.resolve('dist');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const oldWorker = worker.replace(/const CACHE = '[^']+';/, "const CACHE = 'open-world-offline-upgrade-old';")
  .replace("FILES.map(url => new Request(url, { cache: 'reload' }))", 'FILES');
let updated = false;
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', pathname === '/sw.js' ? 'no-store' : 'public, max-age=3600');
  if (pathname === '/sw.js') res.end(updated ? worker : oldWorker);
  else if (file === path.join(root, 'index.html') && !updated) {
    res.end(fs.readFileSync(file, 'utf8').replace('<head>', '<head><meta name="upgrade-fixture" content="old">'));
  } else res.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  await page.goto(url);
  const launcher = page.getByLabel('あなたの名前');
  await launcher.waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const save = () => page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('open-world:session:v1', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, read = db.transaction('saves').objectStore('saves').get('current');
      read.onsuccess = () => { const { savedAt, ...contents } = read.result; resolve(contents); db.close(); };
      read.onerror = () => reject(read.error);
    };
  }));
  const before = await save();
  assert.ok(before.profile.id);
  assert.equal(await page.locator('meta[name="upgrade-fixture"]').count(), 1);
  updated = true;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    if (registration.installing) await new Promise(resolve => {
      const installing = registration.installing;
      installing.addEventListener('statechange', () => {
        if (['installed', 'activated', 'redundant'].includes(installing.state)) resolve();
      });
    });
    if (registration.waiting) await new Promise(resolve => {
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      registration.waiting.postMessage('ACTIVATE_UPDATE');
    });
  });
  await page.reload();
  await launcher.waitFor();
  assert.equal(await page.locator('meta[name="upgrade-fixture"]').count(), 0, 'updated worker must not retain HTTP-cached old HTML');
  assert.deepEqual(await save(), before, 'updating must preserve the personal save');
  await context.setOffline(true);
  await page.reload();
  await launcher.waitFor();
  assert.deepEqual(await save(), before, 'offline reload must preserve the personal save');
  fs.mkdirSync('world-session-checks', { recursive: true });
  await page.screenshot({ path: 'world-session-checks/offline-update.png' });
  console.log('generated worker: cached old HTML replaced, save preserved, offline launch passed');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
