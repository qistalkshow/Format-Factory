import mammoth from 'mammoth';
import { test, expect, files, run, download } from './pdf-helpers';
import { supportsRasterWorker } from './capabilities';
import { PDFDocument, PDFRawStream, PDFName } from 'pdf-lib';
import { unzipSync, strFromU8, zipSync, strToU8 } from 'fflate';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
test.setTimeout(90000);
async function acknowledge(page: Page, operation: string) {
  await page
    .getByLabel('PDF 處理動作', { exact: true })
    .selectOption(operation);
  await page.getByLabel('我了解 Tier 2').check();
}
async function checkPdf(bytes: Buffer, page: Page) {
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThan(0);
  const images = pdf.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter(
      (object): object is PDFRawStream =>
        object instanceof PDFRawStream &&
        object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'),
    );
  expect(images.length).toBeGreaterThan(0);
  const ink = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const image = await createImageBitmap(
      new Blob([bytes], { type: 'image/jpeg' }),
    );
    const c = document.createElement('canvas');
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    image.close();
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4)
      if (data[i] < 180 || data[i + 1] < 180 || data[i + 2] < 180) count++;
    return count;
  }, Buffer.from(images[0].contents).toString('base64'));
  expect(ink).toBeGreaterThan(100);
}
test('M4 PDF exports contain editable text, real tables and embedded images', async ({
  page,
}) => {
  test.skip(
    !(await supportsRasterWorker(page)),
    'Worker Canvas unavailable; fallback tested.',
  );
  await page.goto('./');
  await files(page, ['office-source.pdf']);
  await acknowledge(page, 'docx');
  await run(page);
  const docxBytes = await download(page, /下載 DOCX/);
  expect((await mammoth.convertToHtml({ buffer: docxBytes })).value).toContain(
    'Alpha',
  );
  const doc = unzipSync(docxBytes),
    xml = strFromU8(doc['word/document.xml']);
  expect(xml).toContain('SELF CREATED OFFICE');
  expect(xml).toContain('<w:tbl>');
  expect(xml).toContain('Alpha');
  expect(xml).toContain('Heading1');
  expect(Object.keys(doc).some((p) => p.startsWith('word/media/'))).toBe(true);
  await acknowledge(page, 'xlsx');
  await run(page);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(
    new Uint8Array(await download(page, /下載 XLSX/)).buffer,
  );
  expect(book.worksheets).toHaveLength(1);
  expect(book.worksheets[0].getRow(4).getCell(1).text).toBe('Alpha');
  expect(book.worksheets[0].getRow(4).getCell(2).text).toBe('12');
  expect(book.worksheets[0].getSheetValues().flat().join(' ')).toContain(
    'Alpha',
  );
  await files(page, ['pages.pdf']);
  await acknowledge(page, 'xlsx');
  await run(page);
  const fallback = new ExcelJS.Workbook();
  await fallback.xlsx.load(
    new Uint8Array(await download(page, /下載 XLSX/)).buffer,
  );
  expect(fallback.worksheets).toHaveLength(3);
  expect(fallback.worksheets[0].getCell('A1').text).toContain(
    'SELF CREATED PAGE 1',
  );
  await files(page, ['scan.pdf']);
  await acknowledge(page, 'xlsx');
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('找不到可輸出的內容', {
    timeout: 30000,
  });
});
test('M4 DOCX XLSX PPTX produce readable page-image PDFs with no external requests', async ({
  page,
}) => {
  test.skip(
    !(await supportsRasterWorker(page)),
    'Worker Canvas unavailable; fallback tested.',
  );
  await page.goto('./');
  for (const kind of ['docx', 'xlsx', 'pptx']) {
    await files(page, [`office-source.${kind}`]);
    await acknowledge(page, `from-${kind}`);
    await run(page);
    await checkPdf(await download(page, /下載 PDF 結果/), page);
  }
});
test('M4 unsafe external relationships and uncached formulas fail clearly', async ({
  page,
}) => {
  await page.goto('./');
  const source = unzipSync(await readFile('tests/fixtures/office-source.docx'));
  source['word/_rels/external.xml.rels'] = strToU8(
    '<Relationships><Relationship Id="rBad" Type="image" Target="https://example.invalid/private.png" TargetMode="External"/></Relationships>',
  );
  await page.locator('input[type=file]').setInputFiles({
    name: 'external.docx',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(zipSync(source)),
  });
  await acknowledge(page, 'from-docx');
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('外部連結');
  await files(page, ['office-formula.xlsx']);
  await acknowledge(page, 'from-xlsx');
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('公式缺少', {
    timeout: 30000,
  });
});
test('M4 unsupported Worker Canvas has a usable error', async ({ page }) => {
  test.skip(
    await supportsRasterWorker(page),
    'This browser supports Worker Canvas.',
  );
  await page.goto('./');
  await files(page, ['office-source.docx']);
  await acknowledge(page, 'from-docx');
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Worker Canvas', {
    timeout: 30000,
  });
});

test.describe('M4 cancellation and batch', () => {
  test.use({ serviceWorkers: 'block' });
  test('M4 cancels the worker and can restart a same-format batch and ZIP', async ({
    page,
  }) => {
    test.skip(
      !(await supportsRasterWorker(page)),
      'Worker Canvas unavailable; fallback covered.',
    );
    await page.goto('./');
    await files(page, ['office-source.docx', 'office-source.docx']);
    await acknowledge(page, 'from-docx');
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/pdf-office-from-docx-*.js', async (route) => {
      await gate;
      await route.continue().catch(() => {});
    });
    await page
      .getByRole('button', { name: '開始 PDF 處理', exact: true })
      .click();
    await page
      .getByRole('button', { name: '取消 PDF 任務', exact: true })
      .click();
    await expect(page.getByTestId('pdf-status')).toHaveText('已取消');
    release();
    await page.unroute('**/pdf-office-from-docx-*.js');
    await run(page);
    await expect(page.getByRole('link', { name: /下載 PDF 結果/ })).toHaveCount(
      2,
    );
    await page
      .getByRole('button', { name: '打包所有結果 ZIP', exact: true })
      .click();
    const packed = unzipSync(await download(page, /下載 PDF ZIP/));
    expect(Object.keys(packed)).toHaveLength(2);
    for (const bytes of Object.values(packed))
      expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
  });
});
