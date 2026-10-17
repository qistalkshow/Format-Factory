import { test, expect, files, run, download } from './pdf-helpers';
import { supportsRasterWorker } from './capabilities';
import { startStaticServer } from './static-server';
import { PDFDocument } from 'pdf-lib';
import { unzipSync, strFromU8 } from 'fflate';
test.setTimeout(120000);
test('M4 prepared engines export Office and PDF after the server closes', async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(
    !(await supportsRasterWorker(page)),
    'Worker Canvas unavailable; fallback covered.',
  );
  const server = await startStaticServer(new URL(baseURL!).pathname),
    external: string[] = [],
    officeLoads: string[] = [];
  context.on('request', (r) => {
    const url = new URL(r.url());
    if (
      /^https?:$/.test(url.protocol) &&
      url.origin !== new URL(server.url).origin
    )
      external.push(r.url());
    if (/pdf-office-|exceljs\.min-|jszip\.min-/.test(url.pathname))
      officeLoads.push(url.pathname);
  });
  await page.addInitScript(() =>
    document.addEventListener('securitypolicyviolation', () => {
      document.documentElement.dataset.officeCsp = 'violation';
    }),
  );
  try {
    await page.goto(server.url);
    await expect(page.getByTestId('offline-status')).toHaveText(
      '基礎離線資源已就緒',
    );
    await page.reload();
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );
    expect(officeLoads).toEqual([]);
    await files(page, ['office-source.docx']);
    expect(officeLoads).toEqual([]);
    await page
      .getByRole('button', { name: '準備完整 PDF 離線資源', exact: true })
      .click();
    await expect(
      page.getByText('PDF 離線資源已就緒', { exact: true }),
    ).toBeVisible({ timeout: 60000 });
    await server.close();
    expect((await page.reload())?.fromServiceWorker()).toBe(true);
    await files(page, ['office-source.docx']);
    await page.getByLabel('我了解 Tier 2').check();
    await run(page);
    expect(
      (
        await PDFDocument.load(await download(page, /下載 PDF 結果/))
      ).getPageCount(),
    ).toBeGreaterThan(0);
    await files(page, ['office-source.pdf']);
    await page.getByLabel('PDF 處理動作', { exact: true }).selectOption('docx');
    await page.getByLabel('我了解 Tier 2').check();
    await run(page);
    expect(
      strFromU8(
        unzipSync(await download(page, /下載 DOCX/))['word/document.xml'],
      ),
    ).toContain('Alpha');
    await page.getByLabel('Word 版面模式').selectOption('appearance');
    await run(page);
    const appearance = unzipSync(await download(page, /下載 DOCX/));
    expect(
      Object.keys(appearance).some((path) =>
        /^word\/media\/.*\.png$/.test(path),
      ),
    ).toBe(true);
    expect(strFromU8(appearance['word/document.xml'])).toContain('<wp:anchor ');
    expect(external).toEqual([]);
    expect(
      await page.locator('html').getAttribute('data-office-csp'),
    ).toBeNull();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await server.close();
  }
});
