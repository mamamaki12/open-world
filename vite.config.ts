import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { appVersion } from './scripts/app-version.mjs';

const builtAt = new Date().toISOString();
let revision = 'local';
try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* Source archives can still be built. */ }
const appBuild = { id: revision + '@' + builtAt, version: appVersion(), builtAt };
function versionMetadata(): Plugin {
  return { name: 'world-version',
    configureServer(server) { server.middlewares.use((req, res, next) => {
      if (new URL(req.url ?? '/', 'http://vite.local').pathname !== '/version.json') return next();
      res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(appBuild));
    }); },
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(appBuild) }); },
  };
}

function offlineCache() {
  return { name: 'world-offline-cache', apply: 'build' as const, closeBundle() {
    const root = 'dist', files: string[] = [];
    const walk = (dir: string) => { for (const f of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, f.name); if (f.isDirectory()) walk(path); else if (f.name !== 'sw.js' && f.name !== 'version.json') files.push('./' + relative(root, path).replace(/\\/g, '/'));
    }};
    walk(root);
    writeFileSync(join(root, 'sw.js'), `
const CACHE = 'open-world-offline-${Date.now()}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(url => new Request(url, { cache: 'reload' }))))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const old = (await caches.keys()).filter(k => k.startsWith('open-world-offline-') && k !== CACHE).sort().reverse();
  await Promise.all(old.slice(1).map(k => caches.delete(k))); await self.clients.claim();
})()));
self.addEventListener('message', event => { if(event.data === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url); if(event.request.method !== 'GET' || url.origin !== location.origin) return;
  if(url.pathname === new URL('./version.json', self.location.href).pathname) {
    event.respondWith(fetch(event.request, {cache:'no-store'})); return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if(event.request.mode === 'navigate') {
      return (await cache.match('./index.html')) || fetch(event.request);
    }
    const hit = await cache.match(event.request, {ignoreSearch:true}); if(hit) return hit;
    const response = await fetch(event.request); if(response.ok) await cache.put(event.request, response.clone()); return response;
  })());
});
`);
  }};
}

// base: './' so the built files work from any folder (static hosting, file preview)
export default defineConfig({
  base: './',
  plugins: [react(), versionMetadata(), offlineCache()],
  // 今動いている版がいつ作られたかを設定メニューに出す
  define: { __BUILD_TIME__: JSON.stringify(builtAt), __APP_BUILD__: JSON.stringify(appBuild) },
  build: {
    // ライブラリを別ファイルにして、ゲーム側を更新してもブラウザのキャッシュが効くようにする
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          react: ['react', 'react-dom', 'zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
