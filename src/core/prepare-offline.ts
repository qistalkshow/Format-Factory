// 只下載已建置的同源靜態資源；有限並行避免逐檔網路延遲累積。
export async function prepareOfflineAssets(
  root: URL,
  manifestName: string,
  signal: AbortSignal,
  onProgress: (p: number) => void,
  concurrency = 4,
) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6)
    throw new Error('offline');
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  try {
    const response = await fetch(new URL(manifestName, root), {
      signal: controller.signal,
      redirect: 'error',
    });
    if (!response.ok) throw new Error('offline');
    const manifest: unknown = await response.json();
    if (
      !manifest ||
      typeof manifest !== 'object' ||
      !('paths' in manifest) ||
      !Array.isArray(manifest.paths) ||
      !manifest.paths.length ||
      manifest.paths.length > 1024
    )
      throw new Error('offline');
    // 先驗證整份清單，避免下載到一半才發現外部網址。
    const urls = [
      ...new Set(
        manifest.paths.map((path: unknown) => {
          if (typeof path !== 'string') throw new Error('offline');
          const url = new URL(path, root);
          if (
            url.origin !== root.origin ||
            !url.pathname.startsWith(root.pathname) ||
            url.search ||
            url.hash ||
            url.username ||
            url.password
          )
            throw new Error('offline');
          return url.href;
        }),
      ),
    ];
    let next = 0,
      completed = 0;
    const work = async () => {
      while (next < urls.length) {
        controller.signal.throwIfAborted();
        const url = urls[next++];
        const response = await fetch(url, {
          signal: controller.signal,
          redirect: 'error',
        });
        if (!response.ok) throw new Error('offline');
        // 逐塊消耗回應，不再額外保留整份 WASM ArrayBuffer。
        const reader = response.body?.getReader();
        if (reader) {
          try {
            while (!(await reader.read()).done)
              controller.signal.throwIfAborted();
          } finally {
            reader.releaseLock();
          }
        }
        controller.signal.throwIfAborted();
        onProgress(++completed / urls.length);
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(Math.max(1, Math.floor(concurrency)), urls.length) },
        work,
      ),
    );
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
  }
}
