import { test, expect, files, run, download } from './pdf-helpers';
import { supportsRasterWorker } from './capabilities';
import { unzipSync, strFromU8 } from 'fflate';
import { PDFDocument } from 'pdf-lib';

test('Office formatting: editable runs, page geometry, repeated image positions and page appearance', async ({
  page,
}, testInfo) => {
  test.skip(
    !(await supportsRasterWorker(page)),
    'Worker Canvas unavailable; existing fallback tests apply.',
  );
  await page.goto('./');
  await files(page, ['formatting.pdf']);
  await page.getByLabel('PDF 處理動作', { exact: true }).selectOption('docx');
  await page.getByLabel('我了解 Tier 2').check();
  await run(page);
  const editable = unzipSync(await download(page, /下載 DOCX/));
  const source = strFromU8(editable['word/document.xml']);
  expect(source).toContain('<w:b/>');
  expect(source).toContain('<w:i/>');
  expect(source).toContain('<w:u ');
  expect(source).toContain('w:orient="landscape"');
  expect(source).toContain('w:position w:val="6pt"');
  expect(source).toContain('w:position w:val="-4pt"');
  expect(source).toContain('w:w="12240"');
  expect(source).toContain('w:w="15840"');
  expect(source.match(/<wp:anchor /g)).toHaveLength(2);
  expect(source).toContain('<wp:posOffset>3810000</wp:posOffset>');
  await page.getByLabel('Word 版面模式').selectOption('appearance');
  await run(page);
  const result = await download(page, /下載 DOCX/);
  await testInfo.attach('page-appearance.docx', {
    body: result,
    contentType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const appearance = unzipSync(result),
    output = strFromU8(appearance['word/document.xml']);
  expect(output).not.toContain('FORMATTING FIXTURE');
  expect(output.match(/<wp:anchor /g)).toHaveLength(2);
  const pngs = Object.entries(appearance).filter(([path]) =>
    /word\/media\/.*\.png$/.test(path),
  );
  expect(pngs).toHaveLength(2);
  const dimensions = pngs.map(([, bytes]) => [
    new DataView(bytes.buffer, bytes.byteOffset).getUint32(16),
    new DataView(bytes.buffer, bytes.byteOffset).getUint32(20),
  ]);
  expect(dimensions).toContainEqual([1224, 1584]);
  expect(dimensions).toContainEqual([1584, 1224]);
  for (const [path, bytes] of pngs)
    await testInfo.attach(path.split('/').at(-1)!, {
      body: Buffer.from(bytes),
      contentType: 'image/png',
    });
  await files(page, ['formatting.docx']);
  await page
    .getByLabel('PDF 處理動作', { exact: true })
    .selectOption('from-docx');
  await page.getByLabel('我了解 Tier 2').check();
  await run(page);
  const pdfBytes = await download(page, /下載 PDF 結果/);
  const pdf = await PDFDocument.load(pdfBytes);
  expect(pdf.getPages()[0].getSize()).toEqual({ width: 612, height: 792 });
  await testInfo.attach('formatted.pdf', {
    body: pdfBytes,
    contentType: 'application/pdf',
  });
  for (const format of ['xlsx', 'pptx']) {
    await files(page, [`formatting.${format}`]);
    await page.getByLabel('我了解 Tier 2').check();
    await run(page);
    const bytes = await download(page, /下載 PDF 結果/);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    await testInfo.attach(`formatted-${format}.pdf`, {
      body: bytes,
      contentType: 'application/pdf',
    });
  }
});
