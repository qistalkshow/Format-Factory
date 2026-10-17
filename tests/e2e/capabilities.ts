import type { Page } from '@playwright/test';
export async function supportsRasterWorker(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const url = URL.createObjectURL(
          new Blob(
            [
              `let supported=false;try {supported=typeof createImageBitmap==='function' && typeof OffscreenCanvas==='function' && !!new OffscreenCanvas(1,1).getContext('2d');}catch{}postMessage(supported);`,
            ],
            { type: 'text/javascript' },
          ),
        );
        const worker = new Worker(url);
        const finish = (value: boolean) => {
          clearTimeout(timer);
          worker.terminate();
          URL.revokeObjectURL(url);
          resolve(value);
        };
        const timer = setTimeout(() => finish(false), 5000);
        worker.onmessage = (e: MessageEvent<boolean>) => finish(e.data);
        worker.onerror = () => finish(false);
      }),
  );
}
