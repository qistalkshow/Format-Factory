import { test, expect, files, run, download } from './pdf-helpers';
import { startStaticServer } from './static-server';
import { supportsRasterWorker } from './capabilities';
import { PDFDocument } from 'pdf-lib';
test('PDF engines stay lazy; prepared assets render and convert fully offline', async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(
    !(await supportsRasterWorker(page)),
    'Rendering requires Worker Canvas.',
  );
  const server = await startStaticServer(new URL(baseURL!).pathname);
  const external: string[] = [],
    engine: string[] = [];
  context.on('request', (r) => {
    const url = new URL(r.url());
    if (
      /^https?:$/.test(url.protocol) &&
      url.origin !== new URL(server.url).origin
    )
      external.push(r.url());
    if (/pdf-engine\/|\/pdf-(engine|worker|renderer|pptx)/.test(url.pathname))
      engine.push(url.pathname);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', () => {
      document.documentElement.dataset.pdfCsp = 'violation';
    });
  });
  try {
    await page.goto(server.url);
    await expect(page.getByTestId('offline-status')).toHaveText(
      '基礎離線資源已就緒',
    );
    expect(engine).toEqual([]);
    await page.getByRole('button', { name: /PDF 開啟 PDF/ }).click();
    await page.getByRole('button', { name: '準備完整 PDF 離線資源' }).click();
    await expect(
      page.getByText('PDF 離線資源已就緒', { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await server.close();
    expect((await page.reload())?.fromServiceWorker()).toBe(true);
    await files(page, ['script.pdf']);
    await page
      .getByRole('combobox', { name: 'PDF 處理動作', exact: true })
      .selectOption('compress');
    await page.getByLabel('我了解頁面').check();
    await run(page);
    expect(
      (
        await PDFDocument.load(await download(page, /下載 PDF 結果/))
      ).getPageCount(),
    ).toBe(3);
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-pdf-csp',
      'violation',
    );
    expect(external).toEqual([]);
  } finally {
    await server.close();
  }
});
test('PDF unavailable rendering reports a useful fallback while merge remains available', async ({
  page,
}) => {
  test.skip(
    await supportsRasterWorker(page),
    'Full rendering covered by conversion tests.',
  );
  await page.goto('./');
  await files(page, ['pages.pdf']);
  await page
    .getByRole('combobox', { name: 'PDF 處理動作', exact: true })
    .selectOption('compress');
  await page.getByLabel('我了解頁面').check();
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Worker Canvas');
  await page
    .getByRole('combobox', { name: 'PDF 處理動作', exact: true })
    .selectOption('merge');
  await run(page);
  expect(
    (
      await PDFDocument.load(await download(page, /下載 PDF 結果/))
    ).getPageCount(),
  ).toBe(3);
});
