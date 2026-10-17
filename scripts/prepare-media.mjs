import {
  mkdir,
  readdir,
  copyFile,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const root = 'public/media-engine';
await mkdir(`${root}/wrapper`, { recursive: true });
for (const name of await readdir('node_modules/@ffmpeg/ffmpeg/dist/esm'))
  if (name.endsWith('.js'))
    await copyFile(
      `node_modules/@ffmpeg/ffmpeg/dist/esm/${name}`,
      `${root}/wrapper/${name}`,
    );
// 不保留官方 CDN 預設值；即使呼叫端漏傳 URL，也只會載入本站核心。
const constants = `${root}/wrapper/const.js`;
const original = await readFile(constants, 'utf8');
const patched = original.replace(
  /export const CORE_URL = .*;/,
  'export const CORE_URL = new URL("../ffmpeg-core.js", import.meta.url).href;',
);
if (original === patched)
  throw new Error('FFmpeg wrapper fallback changed; review required');
await writeFile(constants, patched);
for (const name of ['ffmpeg-core.js', 'ffmpeg-core.wasm'])
  await copyFile(
    `node_modules/@ffmpeg/core/dist/esm/${name}`,
    `${root}/${name}`,
  );
await copyFile(
  'public/media-licenses/WRAPPER-MIT.txt',
  `${root}/WRAPPER-LICENSE.txt`,
);
const entries = [];
for (const name of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  const bytes = await readFile(`${root}/${name}`);
  entries.push({ name, bytes: bytes.length, gzip: gzipSync(bytes).length });
}
await writeFile(`${root}/sizes.json`, JSON.stringify(entries));
console.log('Self-hosted single-thread media core:', entries);
