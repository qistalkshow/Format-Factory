import { test as base, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
export { expect };
export const test = base.extend<{ privacy: void }>({
  privacy: [
    async ({ context, baseURL }, use, info) => {
      const external: string[] = [];
      context.on('request', (r) => {
        if (
          !info.title.includes('offline media') &&
          /^https?:/.test(r.url()) &&
          new URL(r.url()).origin !== new URL(baseURL!).origin
        )
          external.push(r.url());
      });
      await use();
      expect(external).toEqual([]);
    },
    { auto: true },
  ],
});
export async function mediaFiles(page: Page, names: string[]) {
  await page
    .locator('input[type=file]')
    .setInputFiles(names.map((name) => `tests/fixtures/${name}`));
  await expect(page.locator('.media-controls')).toHaveCSS(
    'border-top-width',
    '0px',
  );
}
export async function mediaRun(page: Page, count = 1) {
  await page.getByRole('button', { name: '開始影音處理', exact: true }).click();
  await expect(
    page.getByTestId('media-status').filter({ hasText: '處理完成' }),
  ).toHaveCount(count, { timeout: 90000 });
}
export async function mediaDownload(page: Page, index = 0) {
  const waiting = page.waitForEvent('download');
  await page
    .getByRole('link', { name: '下載影音結果', exact: true })
    .nth(index)
    .click();
  return readFile((await (await waiting).path())!);
}
export async function verifyMedia(page: Page, bytes: Buffer, decode = false) {
  return page.evaluate(
    async ({ base64, decode }) => {
      const root = new URL('media-engine/', location.href);
      const module = await import(
        /* @vite-ignore */ new URL('wrapper/index.js', root).href
      );
      const engine: import('@ffmpeg/ffmpeg').FFmpeg = new module.FFmpeg();
      try {
        await engine.load({
          coreURL: new URL('ffmpeg-core.js', root).href,
          wasmURL: new URL('ffmpeg-core.wasm', root).href,
          classWorkerURL: new URL('wrapper/worker.js', root).href,
        });
        await engine.writeFile(
          'result',
          Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
        );
        const code = await engine.ffprobe([
          '-v',
          'error',
          '-i',
          'result',
          '-show_streams',
          '-show_format',
          '-of',
          'json',
          '-o',
          'info.json',
        ]);
        if (code !== 0 && code !== -1) throw new Error('Invalid output');
        const info = JSON.parse(
          (await engine.readFile('info.json', 'utf8')) as string,
        ) as {
          streams: {
            codec_type: string;
            codec_name: string;
            width?: number;
            height?: number;
          }[];
          format: { duration: string; tags?: { title?: string } };
        };
        let pixel: number[] = [];
        if (decode) {
          if (
            await engine.exec([
              '-i',
              'result',
              '-map',
              '0:v:0',
              '-frames:v',
              '1',
              '-vf',
              'scale=1:1',
              '-pix_fmt',
              'rgb24',
              '-f',
              'rawvideo',
              '-threads',
              '1',
              'pixel',
            ])
          )
            throw new Error('Decode failed');
          pixel = Array.from((await engine.readFile('pixel')) as Uint8Array);
        }
        return { ...info, pixel };
      } finally {
        engine.terminate();
      }
    },
    { base64: bytes.toString('base64'), decode },
  );
}
