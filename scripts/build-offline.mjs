import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { deferredPdf, deferredMedia, precached } from './offline-plan.mjs';

async function walk(directory, prefix = '') {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    if (entry.name.startsWith('.') || entry.name === 'sw.js') continue;
    if (entry.isDirectory())
      paths.push(...(await walk(join(directory, entry.name), `${path}/`)));
    else paths.push(path);
  }
  return paths.sort();
}
const paths = await walk('dist');
const pdfPaths = paths.filter(deferredPdf);
let pdfBytes = 0;
for (const path of pdfPaths)
  pdfBytes += (await readFile(join('dist', path))).length;
await writeFile(
  'dist/pdf-assets.json',
  JSON.stringify({ paths: pdfPaths, bytes: pdfBytes }),
);
paths.push('pdf-assets.json');
const mediaPaths = paths.filter(deferredMedia);
let mediaBytes = 0;
for (const path of mediaPaths)
  mediaBytes += (await readFile(join('dist', path))).length;
await writeFile(
  'dist/media-assets.json',
  JSON.stringify({ paths: mediaPaths, bytes: mediaBytes }),
);
paths.push('media-assets.json');
const hash = createHash('sha256');
for (const path of paths)
  hash.update(path).update(await readFile(join('dist', path)));
const revision = hash.digest('hex').slice(0, 16);
// 只預快取建置產物；不快取執行期請求、使用者檔案或外部資源。
const source = `
const ASSETS = ${JSON.stringify(paths)};
const PRECACHE = ${JSON.stringify(paths.filter(precached))};
const ROOT = new URL('./', self.location.href);
const PREFIX = 'formatfactory:' + ROOT.pathname + ':';
const CACHE = PREFIX + '${revision}';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(path => new Request(new URL(path, ROOT), { cache: 'reload' })))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin) return;
  const relative = url.pathname.slice(ROOT.pathname.length);
  const home = url.pathname === ROOT.pathname || url.pathname === ROOT.pathname + 'index.html';
  if (!home && (!url.pathname.startsWith(ROOT.pathname) || !ASSETS.includes(relative) || url.search)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(new URL(home ? 'index.html' : relative, ROOT).href);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && ASSETS.includes(relative)) await cache.put(new URL(relative, ROOT).href, response.clone());
    return response;
  })());
});
`;
await writeFile('dist/sw.js', source.trim());
console.log(
  `Offline precache: ${paths.filter(precached).length} assets; deferred PDF: ${pdfPaths.length}; revision ${revision}`,
);
