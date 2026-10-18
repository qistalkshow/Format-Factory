import { test, expect, files, run, download } from './pdf-helpers';
import { supportsRasterWorker } from './capabilities';
import { unzipSync, strFromU8 } from 'fflate';
import { DOMParser } from '@xmldom/xmldom';

test('PDF images are anchored before editable text on every dense source page', async ({
  page,
}, testInfo) => {
  test.skip(!(await supportsRasterWorker(page)), 'Worker Canvas unavailable');
  await page.goto('./');
  await files(page, ['image-anchors.pdf']);
  await page.getByLabel('PDF 處理動作', { exact: true }).selectOption('docx');
  await page.getByLabel('我了解 Tier 2').check();
  await run(page);
  const bytes = await download(page, /下載 DOCX/);
  const source = strFromU8(unzipSync(bytes)['word/document.xml']);
  const document = new DOMParser().parseFromString(source, 'application/xml');
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body = document.getElementsByTagNameNS(ns, 'body')[0];
  const children = Array.from(body.childNodes).filter(
    (node) => node.nodeType === 1,
  );
  const anchors = children.filter((node) =>
    node.toString().includes('<wp:anchor '),
  );
  expect(anchors).toHaveLength(2);
  for (const anchor of anchors) {
    expect(anchor.toString().match(/<wp:anchor /g)).toHaveLength(2);
    expect(anchor.toString()).toContain('locked="1"');
    expect(anchor.toString()).toContain('layoutInCell="0"');
    expect(anchor.toString()).toContain('relativeFrom="page"');
    expect(anchor.toString()).toContain('5334000');
    expect(anchor.toString()).toContain('2057400');
  }
  expect(children[0]).toBe(anchors[0]);
  const second = children.indexOf(anchors[1]);
  expect(children[second - 1].toString()).toContain('<w:sectPr>');
  expect(source).toContain('Page 1 question 49');
  expect(source).toContain('Page 2 question 49');
  await testInfo.attach('image-anchors.docx', {
    body: bytes,
    contentType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
});

test('PDF quality acknowledgement stays checked after changing operation', async ({
  page,
}) => {
  await page.goto('./');
  await files(page, ['office-source.pdf']);
  const choice = page.getByLabel('PDF 處理動作', { exact: true });
  const acknowledgement = page.getByLabel('我了解 Tier 2');
  for (const operation of ['docx', 'xlsx', 'docx', 'xlsx']) {
    await choice.selectOption(operation);
    await expect(acknowledgement).not.toBeChecked();
    await acknowledgement.check();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(acknowledgement).toBeChecked();
    await expect(
      page.getByRole('button', { name: '開始 PDF 處理', exact: true }),
    ).toBeEnabled();
  }
});
