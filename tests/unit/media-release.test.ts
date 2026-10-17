import { afterEach, expect, test } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { zipSync } from 'fflate';
const checker = resolve('scripts/check-media-release.mjs');
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
const hash = (data: Uint8Array | string) =>
  createHash('sha256').update(data).digest('hex');
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'formatfactory-source-test-'));
  roots.push(root);
  const licenses = join(root, 'dist/media-licenses');
  await mkdir(licenses, { recursive: true });
  await mkdir(join(root, 'scripts'));
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      dependencies: { '@ffmpeg/core': '0.12.10', '@ffmpeg/ffmpeg': '0.12.15' },
    }),
  );
  const names = [
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
  const sources = names.map((name) => ({
    repo: `test/${name}`,
    path: `${name}.txt`,
    sha256: hash(name),
  }));
  for (const entry of sources)
    await writeFile(join(licenses, entry.path), entry.repo.split('/')[1]);
  await writeFile(join(root, 'dist/core.wasm'), 'binary');
  const manifest = JSON.stringify({
    core: '0.12.10',
    wrapper: '0.12.15',
    sources,
    binaries: [{ path: 'core.wasm', sha256: hash('binary') }],
  });
  await writeFile(join(licenses, 'source-manifest.json'), manifest);
  await writeFile(
    join(root, 'scripts/media-source-status.json'),
    JSON.stringify({
      verified: true,
      manifest: { path: 'source-manifest.json', sha256: hash(manifest) },
    }),
  );
  await writeFile(join(root, 'app.ts'), 'source');
  const zip = zipSync({ 'app.ts': new TextEncoder().encode('source') });
  await writeFile(join(licenses, 'app-source.zip'), zip);
  await writeFile(
    join(licenses, 'app-source.json'),
    JSON.stringify({
      path: 'app-source.zip',
      sha256: hash(zip),
      files: ['app.ts'],
    }),
  );
  return { root, licenses };
}
function run(root: string) {
  return spawnSync(process.execPath, [checker], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10000,
  });
}
test('release gate accepts matching source and binary evidence', async () => {
  const { root } = await fixture();
  expect(run(root).status).toBe(0);
});
test('verified flag cannot bypass a missing codec source', async () => {
  const { root, licenses } = await fixture();
  await rm(join(licenses, 'x264.txt'));
  expect(run(root).status).not.toBe(0);
});
test('release gate rejects a substituted binary', async () => {
  const { root } = await fixture();
  await writeFile(join(root, 'dist/core.wasm'), 'different');
  const result = run(root);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('digest mismatch');
});
test('release gate rejects stale application source', async () => {
  const { root } = await fixture();
  await writeFile(join(root, 'app.ts'), 'changed after build');
  const result = run(root);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Application source differs');
});
