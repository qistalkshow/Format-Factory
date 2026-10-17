import { PDFDocument } from 'pdf-lib';
import { test, expect, files, dropPdfs, run, download } from './pdf-helpers';
import { unzipSync } from 'fflate';
test('PDF merge reorders pages; split intervals produce real PDFs and ZIP', async ({
  page,
}) => {
  await page.goto('./');
  await dropPdfs(page, ['pages.pdf', 'rotated.pdf']);
  await page.getByRole('button', { name: '往前移 2', exact: true }).click();
  await run(page);
  const merged = await PDFDocument.load(await download(page, /下載 PDF 結果/));
  expect(merged.getPageCount()).toBe(4);
  expect(merged.getPage(0).getRotation().angle).toBe(90);
  await files(page, ['pages.pdf']);
  await page.getByLabel('分割方式').selectOption('every');
  await page.getByLabel('每份頁數').fill('2');
  await run(page);
  const first = await PDFDocument.load(
    await download(page, /下載 PDF 結果/, 0),
  );
  expect(first.getPageCount()).toBe(2);
  await page.getByRole('button', { name: '打包所有結果 ZIP' }).click();
  const zip = unzipSync(await download(page, /下載 PDF ZIP/));
  expect(Object.keys(zip)).toHaveLength(2);
  expect((await PDFDocument.load(Object.values(zip)[1])).getPageCount()).toBe(
    1,
  );
});
test('PDF invalid range, corruption and encrypted merge show useful errors', async ({
  page,
}) => {
  await page.goto('./');
  await files(page, ['pages.pdf']);
  await page.getByLabel('頁碼，例如').fill('0-999');
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('頁碼無效');
  await files(page, ['encrypted.pdf']);
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('已加密');
  await files(page, ['corrupt.pdf']);
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('無法讀取文件');
});
