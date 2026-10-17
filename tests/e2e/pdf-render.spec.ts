import { PDFDocument } from 'pdf-lib';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { test, expect, files, run, download } from './pdf-helpers';
import { supportsRasterWorker } from './capabilities';
import { pixels } from './image-helpers';
test.beforeEach(async ({ page }) => {
  test.skip(
    !(await supportsRasterWorker(page)),
    'PDF rendering needs Worker Canvas; structural operations are tested separately.',
  );
});
test('PDF thumbnails select actual pages; compression and PPTX have valid content', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await files(page, ['pages.pdf']);
  await page.getByLabel('分割方式').selectOption('selected');
  await page.getByRole('button', { name: '載入這一組縮圖' }).click();
  await expect(page.locator('.pdf-thumbnails img')).toHaveCount(3);
  await page.locator('.pdf-thumbnails input').nth(2).check();
  await run(page);
  const split = await PDFDocument.load(await download(page, /下載 PDF 結果/));
  expect(split.getPageCount()).toBe(1);
  expect(split.getPage(0).getWidth()).toBe(400);
  await files(page, ['scan.pdf']);
  await page
    .getByRole('combobox', { name: 'PDF 處理動作', exact: true })
    .selectOption('compress');
  await page.getByLabel('我了解頁面').check();
  await run(page);
  const compressed = await download(page, /下載 PDF 結果/);
  const original = await readFile('tests/fixtures/scan.pdf');
  expect(compressed.length).toBeLessThan(original.length);
  expect((await PDFDocument.load(compressed)).getPageCount()).toBe(1);
  await mkdir('.cache', { recursive: true });
  await writeFile(
    `.cache/pdf-compression-${testInfo.project.name}.json`,
    JSON.stringify({
      original: original.length,
      compressed: compressed.length,
    }),
  );
  await files(page, ['pages.pdf']);
  await page
    .getByRole('combobox', { name: 'PDF 處理動作', exact: true })
    .selectOption('pptx');
  await page.getByLabel('我了解頁面').check();
  await run(page);
  const zip = unzipSync(await download(page, /下載 PPTX/));
  expect(
    Object.keys(zip).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)),
  ).toHaveLength(3);
  expect(
    Object.keys(zip).filter(
      (n) => n.startsWith('ppt/media/') && n.endsWith('.jpeg'),
    ),
  ).toHaveLength(3);
  expect(new TextDecoder().decode(zip['ppt/slides/slide1.xml'])).toContain(
    '<p:pic>',
  );
  const image = Object.entries(zip).find(
    ([name]) => name.startsWith('ppt/media/') && name.endsWith('.jpeg'),
  )!;
  const rendered = await pixels(page, Buffer.from(image[1]), 'image/jpeg');
  expect(rendered.color[0]).toBeGreaterThan(240);
  expect(rendered.color[1]).toBeLessThan(20);
});
test('PDF password errors, large page limit and cancellation are explicit', async ({
  page,
}) => {
  await page.goto('./');
  await files(page, ['encrypted.pdf']);
  await page.getByRole('button', { name: '讀取頁數' }).click();
  await expect(page.getByRole('alert')).toContainText('需要密碼');
  await page.getByLabel('PDF 密碼').fill('wrong');
  await page.getByRole('button', { name: '讀取頁數' }).click();
  await expect(page.getByRole('alert')).toContainText('密碼不正確');
  await page.getByLabel('PDF 密碼').fill('test-only');
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
  await expect(page.getByLabel('PDF 密碼')).toHaveValue('');
  await files(page, ['large-page.pdf']);
  await page
    .getByRole('combobox', { name: 'PDF 處理動作', exact: true })
    .selectOption('compress');
  await page.getByLabel('我了解頁面').check();
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('安全上限');
  await files(page, ['scan.pdf']);
  await page
    .getByRole('combobox', { name: 'PDF 處理動作', exact: true })
    .selectOption('compress');
  await page.getByLabel('我了解頁面').check();
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await page.getByRole('button', { name: '取消 PDF 任務' }).click();
  await expect(page.getByTestId('pdf-status')).toHaveText('已取消');
});
