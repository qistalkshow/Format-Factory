import {
  test,
  expect,
  mediaFiles,
  mediaRun,
  mediaDownload,
  verifyMedia,
} from './media-helpers';
import { startStaticServer } from './static-server';
test.setTimeout(120000);
test('offline media engine is lazy and converts after the source server shuts down', async ({
  page,
  context,
  baseURL,
}) => {
  const server = await startStaticServer(new URL(baseURL!).pathname);
  const external: string[] = [],
    engines: string[] = [];
  context.on('request', (r) => {
    const url = new URL(r.url());
    if (
      /^https?:$/.test(url.protocol) &&
      url.origin !== new URL(server.url).origin
    )
      external.push(r.url());
    if (url.pathname.includes('/media-engine/')) engines.push(url.pathname);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', () => {
      document.documentElement.dataset.mediaCsp = 'violation';
    });
  });
  try {
    await page.goto(server.url);
    await expect(page.getByTestId('offline-status')).toHaveText(
      '基礎離線資源已就緒',
    );
    await page
      .getByRole('button', { name: '影片音訊 開啟影音工具', exact: true })
      .click();
    await expect(page.getByText('請放入 MP4、M4A 或 MP3 檔案。')).toBeVisible();
    expect(engines).toEqual([]);
    await mediaFiles(page, ['tone.mp3']);
    expect(engines).toEqual([]);
    await page
      .getByRole('button', { name: '準備完整影音離線資源', exact: true })
      .click();
    await expect(
      page.getByText('影音離線資源已就緒', { exact: true }),
    ).toBeVisible({ timeout: 60000 });
    await server.close();
    expect((await page.reload())?.fromServiceWorker()).toBe(true);
    await mediaFiles(page, ['tone.mp3']);
    await page.getByLabel('輸出格式', { exact: true }).selectOption('m4a');
    await mediaRun(page);
    expect(
      (await verifyMedia(page, await mediaDownload(page))).streams[0]
        .codec_name,
    ).toBe('aac');
    expect(external).toEqual([]);
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-media-csp',
      'violation',
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await server.close();
  }
});
