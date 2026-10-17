import { test, expect } from './pdf-helpers';
import { startStaticServer } from './static-server';

test('M5 update waits for saved work without forcing a reload', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(60000);
  const server = await startStaticServer(new URL(baseURL!).pathname);
  const external: string[] = [];
  context.on('request', (r) => {
    if (
      /^https?:/.test(r.url()) &&
      new URL(r.url()).origin !== new URL(server.url).origin
    )
      external.push(r.url());
  });
  try {
    await page.goto(server.url);
    await expect(page.getByTestId('offline-status')).toHaveText(
      '基礎離線資源已就緒',
    );
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page
      .locator('input[type=file]')
      .setInputFiles('tests/fixtures/office-source.pdf');
    await expect(page.locator('.pdf-files')).toContainText('office-source.pdf');
    server.updateWorker();
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration!.update();
    });
    await expect(page.getByTestId('offline-status')).toContainText(
      '有新版可用',
    );
    await expect(page.locator('.pdf-files')).toContainText('office-source.pdf');
    expect(external).toEqual([]);
  } finally {
    await server.close();
  }
});
