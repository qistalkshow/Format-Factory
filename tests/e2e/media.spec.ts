import {
  test,
  expect,
  mediaFiles,
  mediaRun,
  mediaDownload,
  verifyMedia,
} from './media-helpers';
import { readFile, writeFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
declare global {
  interface Window {
    activeMediaWorkers: number;
  }
}
test.setTimeout(120000);
test.use({ serviceWorkers: 'block' });
test('media drag batch to MP3, valid audio and ZIP with no external requests', async ({
  page,
}) => {
  await page.goto('./');
  const payload = await Promise.all(
    ['sample.mp4', 'tone.m4a'].map(async (name) => ({
      name,
      data: (await readFile(`tests/fixtures/${name}`)).toString('base64'),
    })),
  );
  const transfer = await page.evaluateHandle((items) => {
    const data = new DataTransfer();
    for (const item of items)
      data.items.add(
        new File(
          [Uint8Array.from(atob(item.data), (c) => c.charCodeAt(0))],
          item.name,
        ),
      );
    return data;
  }, payload);
  await page
    .getByTestId('dropzone')
    .dispatchEvent('drop', { dataTransfer: transfer });
  await transfer.dispose();
  await page.getByLabel('輸出格式', { exact: true }).selectOption('mp3');
  await mediaRun(page, 2);
  const output = await mediaDownload(page);
  expect(output.subarray(0, 3).toString()).toBe('ID3');
  const info = await verifyMedia(page, output);
  expect(info.streams[0].codec_name).toBe('mp3');
  expect(Number(info.format.duration)).toBeCloseTo(3, 0);
  expect(info.format.tags?.title).toBeUndefined();
  await page.getByRole('button', { name: '打包 ZIP', exact: true }).click();
  const waiting = page.waitForEvent('download');
  await page.getByRole('link', { name: '下載影音 ZIP', exact: true }).click();
  expect(
    Object.keys(unzipSync(await readFile((await (await waiting).path())!))),
  ).toHaveLength(2);
});
test('media video compression and audio to M4A then black MP4 have decodable content', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await mediaFiles(page, ['sample.mp4']);
  await page.getByRole('button', { name: '高壓縮', exact: true }).click();
  await mediaRun(page);
  const compressed = await mediaDownload(page),
    original = await readFile('tests/fixtures/sample.mp4');
  expect(compressed.length).toBeLessThan(original.length);
  const info = await verifyMedia(page, compressed, true);
  expect(info.streams.find((s) => s.codec_type === 'video')).toMatchObject({
    codec_name: 'h264',
    width: 640,
    height: 360,
  });
  expect(info.pixel.some((n) => n > 20)).toBe(true);
  await writeFile(
    `.cache/media-compression-${testInfo.project.name}.json`,
    JSON.stringify({
      original: original.length,
      compressed: compressed.length,
    }),
  );
  await mediaFiles(page, ['tone.mp3']);
  await page.getByLabel('輸出格式', { exact: true }).selectOption('m4a');
  await mediaRun(page);
  const m4a = await mediaDownload(page);
  expect(m4a.subarray(4, 8).toString()).toBe('ftyp');
  expect((await verifyMedia(page, m4a)).streams[0].codec_name).toBe('aac');
  await page.locator('input[type=file]').setInputFiles({
    name: 'converted.m4a',
    mimeType: 'audio/mp4',
    buffer: m4a,
  });
  await page.getByLabel('輸出格式', { exact: true }).selectOption('mp4');
  await mediaRun(page);
  const black = await verifyMedia(page, await mediaDownload(page), true);
  expect(black.streams.map((s) => s.codec_type)).toEqual(['video', 'audio']);
  expect(black.pixel.every((n) => n < 5)).toBe(true);
});
test('media corrupt input, no audio and cancelling queued or active jobs are explicit', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as Window & { activeMediaWorkers: number };
    state.activeMediaWorkers = 0;
    const NativeWorker = Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args);
        state.activeMediaWorkers++;
      }
      terminate() {
        state.activeMediaWorkers--;
        super.terminate();
      }
    };
  });
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles({
    name: 'bad.mp3',
    mimeType: 'audio/mpeg',
    buffer: Buffer.from('not media'),
  });
  await page.getByRole('button', { name: '開始影音處理', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('有效的 MP4');
  await mediaFiles(page, ['silent.mp4']);
  await page.getByLabel('輸出格式', { exact: true }).selectOption('mp3');
  await page.getByRole('button', { name: '開始影音處理', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('沒有可抽取', {
    timeout: 30000,
  });
  await mediaFiles(page, ['sample.mp4', 'tone.mp3']);
  // 暫停核心下載，確保取消測到執行中／排隊中兩種狀態，而非和短片完成競速。
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/ffmpeg-core.wasm', async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await page.getByRole('button', { name: '開始影音處理', exact: true }).click();
  await page
    .getByTestId('media-job')
    .nth(1)
    .getByRole('button', { name: '取消', exact: true })
    .click();
  await page
    .getByTestId('media-job')
    .nth(0)
    .getByRole('button', { name: '取消', exact: true })
    .click();
  await expect(
    page.getByTestId('media-status').filter({ hasText: '已取消' }),
  ).toHaveCount(2);
  expect(
    await page.evaluate(
      () =>
        (window as Window & { activeMediaWorkers: number }).activeMediaWorkers,
    ),
  ).toBe(0);
  release();
  await page.unroute('**/ffmpeg-core.wasm');
  await mediaFiles(page, ['tone.mp3']);
  await mediaRun(page);
  expect(
    await page.evaluate(
      () =>
        (window as Window & { activeMediaWorkers: number }).activeMediaWorkers,
    ),
  ).toBe(0);
});
