import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { precached } from './offline-plan.mjs';

const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
const visited = new Set();
const assets = new Set();
function visit(key) {
  if (visited.has(key)) return;
  visited.add(key);
  const chunk = manifest[key];
  if (!chunk) throw new Error(`Missing manifest entry: ${key}`);
  assets.add(chunk.file);
  for (const css of chunk.css || []) assets.add(css);
  for (const imported of chunk.imports || []) visit(imported);
}
for (const [key, chunk] of Object.entries(manifest))
  if (chunk.isEntry) visit(key);
let js = 0;
let css = 0;
for (const path of assets) {
  const size = gzipSync(await readFile(join('dist', path))).length;
  if (path.endsWith('.js')) js += size;
  if (path.endsWith('.css')) css += size;
}
// PDF 引擎與 WASM 按需下載；實際預快取資源均計入首次傳輸預算。
async function totalSize(directory, prefix = '') {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (!entry.isDirectory() && !precached(prefix + entry.name)) continue;
    const path = join(directory, entry.name);
    total += entry.isDirectory()
      ? await totalSize(path, prefix + entry.name + '/')
      : gzipSync(await readFile(path)).length;
  }
  return total;
}
const total = await totalSize('dist');
console.log(`Initial JS gzip: ${js} bytes / 81920`);
console.log(`Initial CSS gzip: ${css} bytes / 15360`);
console.log(
  `Precached static assets gzip (excluding deferred engines): ${total} bytes / 153600`,
);
if (!js || js > 80 * 1024 || css > 15 * 1024 || total > 150 * 1024)
  process.exitCode = 1;
for (const name of (await readdir('dist/assets')).sort()) {
  const data = await readFile(join('dist/assets', name));
  console.log(`${name}: raw ${data.length} B; gzip ${gzipSync(data).length} B`);
}
