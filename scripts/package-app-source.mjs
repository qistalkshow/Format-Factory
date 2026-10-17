import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';
// 明確白名單避免收錄使用者檔案、快取、引擎及來源 ZIP 本身。
const files = {};
async function collect(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = `${path}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Source symlink: ${name}`);
    if (entry.isDirectory()) await collect(name);
    else files[name] = await readFile(name);
  }
}
for (const directory of ['src', 'scripts', 'tests', 'vendor', '.github'])
  await collect(directory);
for (const name of [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'playwright.config.ts',
  'eslint.config.js',
  '.prettierrc.json',
  'index.html',
  'README.md',
  'THIRD_PARTY_LICENSES.md',
  'M3_ENGINE_DECISION.md',
  'M3_VERIFICATION.md',
  'M4_VERIFICATION.md',
  'M5_VERIFICATION.md',
  'LICENSE',
  '.gitignore',
  '.prettierignore',
])
  files[name] = await readFile(name);
for (const name of ['manifest.webmanifest', 'THIRD_PARTY_NOTICES.txt'])
  files[`public/${name}`] = await readFile(`public/${name}`);
await collect('public/icons');
// 核心來源獨立下載；保留清單及建置所需的授權通知。
for (const name of [
  'source-manifest.json',
  'README.txt',
  'GPL-2.0.txt',
  'WRAPPER-MIT.txt',
])
  files[`public/media-licenses/${name}`] = await readFile(
    `public/media-licenses/${name}`,
  );
const bytes = zipSync(files, { level: 9, mtime: new Date(1980, 0, 1) });
await writeFile('public/media-licenses/app-source.zip', bytes);
await writeFile(
  'public/media-licenses/app-source.json',
  JSON.stringify(
    {
      path: 'app-source.zip',
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      files: Object.keys(files).sort(),
    },
    null,
    2,
  ) + '\n',
);
console.log(`Packaged application source: ${bytes.length} bytes`);
