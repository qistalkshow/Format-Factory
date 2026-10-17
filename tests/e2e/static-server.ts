import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

// 僅供 E2E：可關閉的靜態測試主機，用來驗證來源完全離線後仍可使用。
export async function startStaticServer(base: string) {
  const assets = new Map<string, Buffer>();
  async function load(directory: string, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory())
        await load(join(directory, entry.name), `${prefix}${entry.name}/`);
      else
        assets.set(
          `${base}${prefix}${entry.name}`,
          await readFile(join(directory, entry.name)),
        );
    }
  }
  await load('dist');
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webmanifest': 'application/manifest+json',
    '.wasm': 'application/wasm',
  };
  const server = createServer((request, response) => {
    const path = new URL(request.url!, 'http://localhost').pathname;
    const key = path === base ? `${base}index.html` : path;
    const content = assets.get(key);
    response.writeHead(content ? 200 : 404, {
      'Content-Type': types[extname(key)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(content);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('No test server address');
  return {
    url: `http://127.0.0.1:${address.port}${base}`,
    // 只改變測試伺服器的 SW 位元組，模擬新版等待，不修改實際建置。
    updateWorker: () => {
      const key = `${base}sw.js`;
      assets.set(
        key,
        Buffer.concat([assets.get(key)!, Buffer.from('\n// test update\n')]),
      );
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
