import { test as base, expect } from '@playwright/test';
import { supportsRasterWorker } from './capabilities';
export { expect };
export const test = base.extend<{
  privacyMonitor: void;
  rasterCapability: void;
}>({
  rasterCapability: [
    async ({ page }, use, testInfo) => {
      if (
        !/SVG rasterization|malformed|unsupported Worker|preferences/.test(
          testInfo.title,
        )
      )
        testInfo.skip(
          !(await supportsRasterWorker(page)),
          'Worker OffscreenCanvas 2D unavailable; graceful error tested separately.',
        );
      await use();
    },
    { auto: true },
  ],
  privacyMonitor: [
    async ({ context, baseURL }, use, testInfo) => {
      const requests: string[] = [];
      // 兩個獨立離線主機案例有更嚴格的自身 origin 監聽。
      const ownMonitor = /drop image|PNG WASM/.test(testInfo.title);
      context.on('request', (request) => {
        if (
          !ownMonitor &&
          /^https?:/.test(request.url()) &&
          new URL(request.url()).origin !== new URL(baseURL!).origin
        )
          requests.push(request.url());
      });
      await use();
      expect(requests).toEqual([]);
    },
    { auto: true },
  ],
});
