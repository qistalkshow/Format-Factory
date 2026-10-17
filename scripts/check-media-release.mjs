import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { unzipSync } from 'fflate';
const status = JSON.parse(
  await readFile('scripts/media-source-status.json', 'utf8'),
);
if (!status.verified)
  throw new Error(`Media release blocked: ${status.reason}`);
const root = resolve('dist/media-licenses');
async function checked(base, entry) {
  const path = resolve(base, entry.path);
  if (!path.startsWith(base + sep) || !/^[a-f0-9]{64}$/.test(entry.sha256))
    throw new Error('Invalid self-hosted source path or digest');
  const bytes = await readFile(path);
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256)
    throw new Error(`Release digest mismatch: ${entry.path}`);
  return bytes;
}
const manifest = JSON.parse(await checked(root, status.manifest));
const required = [
  'x264',
  'x265',
  'libvpx',
  'lame',
  'Ogg',
  'theora',
  'opus',
  'vorbis',
  'zlib',
  'libwebp',
  'freetype2',
  'fribidi',
  'harfbuzz',
  'libass',
  'FFmpeg',
  'zimg',
  'ffmpeg.wasm',
  'emscripten',
  'SDL',
];
for (const name of required)
  if (!manifest.sources.some((entry) => entry.repo.split('/').at(-1) === name))
    throw new Error(`Missing core source: ${name}`);
for (const source of manifest.sources) await checked(root, source);
for (const binary of manifest.binaries) await checked(resolve('dist'), binary);
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (
  pkg.dependencies['@ffmpeg/core'] !== manifest.core ||
  pkg.dependencies['@ffmpeg/ffmpeg'] !== manifest.wrapper
)
  throw new Error('Core version changed: repeat source audit');
const app = JSON.parse(
  await readFile(resolve(root, 'app-source.json'), 'utf8'),
);
const source = unzipSync(await checked(root, app));
for (const path of app.files) {
  if (!source[path] || !Buffer.from(source[path]).equals(await readFile(path)))
    throw new Error(`Application source differs from build: ${path}`);
}
console.log(
  'Release verified: core hashes, 19 source archives and current application source.',
);
