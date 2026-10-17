import { afterEach, expect, test, vi } from 'vitest';
import { prepareOfflineAssets } from '../../src/core/prepare-offline';
const root = new URL('https://local.test/tool/');
afterEach(() => vi.unstubAllGlobals());
test('bounds parallel downloads, consumes bodies and reports completed assets', async () => {
  const gates: (() => void)[] = [];
  let active = 0,
    peak = 0;
  const fetcher = vi.fn(async (url: URL | string, options?: RequestInit) => {
    expect(options?.redirect).toBe('error');
    if (String(url).endsWith('.json'))
      return Response.json({
        paths: Array.from({ length: 9 }, (_, i) => `asset-${i}.js`),
      });
    active++;
    peak = Math.max(peak, active);
    await new Promise<void>((resolve) => gates.push(resolve));
    active--;
    return new Response('self hosted bytes');
  });
  vi.stubGlobal('fetch', fetcher);
  const progress: number[] = [];
  const result = prepareOfflineAssets(
    root,
    'assets.json',
    new AbortController().signal,
    (p) => progress.push(p),
  );
  await vi.waitFor(() => expect(gates).toHaveLength(4));
  while (progress.length < 9) {
    gates.splice(0).forEach((resolve) => resolve());
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await result;
  expect(peak).toBe(4);
  expect(progress).toEqual(Array.from({ length: 9 }, (_, i) => (i + 1) / 9));
});
test('validates all URLs before fetching any asset and refuses redirects', async () => {
  const fetcher = vi.fn(async () =>
    Response.json({ paths: ['safe.js', 'https://outside.test/file.js'] }),
  );
  vi.stubGlobal('fetch', fetcher);
  await expect(
    prepareOfflineAssets(
      root,
      'assets.json',
      new AbortController().signal,
      () => {},
    ),
  ).rejects.toThrow('offline');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('cancellation aborts active fetches and never starts queued assets', async () => {
  const controller = new AbortController();
  const fetcher = vi.fn(async (url: URL | string, options?: RequestInit) => {
    if (String(url).endsWith('.json'))
      return Response.json({ paths: ['1.js', '2.js', '3.js', '4.js', '5.js'] });
    await new Promise((_, reject) =>
      options?.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('Cancelled', 'AbortError')),
        { once: true },
      ),
    );
    return new Response('unreachable');
  });
  vi.stubGlobal('fetch', fetcher);
  const task = prepareOfflineAssets(
    root,
    'assets.json',
    controller.signal,
    () => {},
  );
  const failure = expect(task).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(5));
  controller.abort();
  await failure;
  expect(fetcher).toHaveBeenCalledTimes(5);
});
