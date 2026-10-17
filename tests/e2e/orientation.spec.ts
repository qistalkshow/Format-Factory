import { test, expect } from './fixtures';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { jpegSegments } from '../../src/modules/image/binary';
import { selectFiles, runAndDownload, pixels } from './image-helpers';
test('all eight EXIF orientations are applied once and normalized when metadata is kept', async ({
  page,
}) => {
  await page.goto('./');
  await selectFiles(
    page,
    Array.from({ length: 8 }, (_, i) => `orientation-${i + 1}.jpg`),
  );
  const cards = page.getByTestId('image-card');
  for (const card of await cards.all())
    await card.getByLabel('保留中繼資料', { exact: true }).check();
  await page.getByRole('button', { name: '處理全部待辦' }).click();
  const corners = [
    [255, 0, 0],
    [0, 255, 0],
    [255, 255, 0],
    [0, 0, 255],
    [255, 0, 0],
    [0, 0, 255],
    [255, 255, 0],
    [0, 255, 0],
  ];
  for (let i = 0; i < 8; i++) {
    await expect(cards.nth(i).getByTestId('job-status')).toHaveText(
      '處理完成',
      {
        timeout: 30000,
      },
    );
    const event = page.waitForEvent('download');
    await cards
      .nth(i)
      .getByRole('link', { name: '下載結果', exact: true })
      .click();
    const output = await readFile((await (await event).path())!);
    const info = await pixels(page, output, 'image/jpeg');
    expect([info.width, info.height]).toEqual(i < 4 ? [64, 40] : [40, 64]);
    expect(
      info.color.slice(0, 3).every((c, k) => Math.abs(c - corners[i][k]) < 35),
    ).toBe(true);
    const exif = jpegSegments(output).find((s) => s.marker === 0xe1)!;
    expect(exif.data[24]).toBe(1);
  }
});

test('JPEG compression removes EXIF by default and measures a real raster fixture', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await selectFiles(page, ['orientation-6.jpg']);
  const card = page.getByTestId('image-card');
  const stripped = await runAndDownload(page, card);
  expect(jpegSegments(stripped).some((s) => s.marker === 0xe1)).toBe(false);
  expect((await pixels(page, stripped, 'image/jpeg')).height).toBe(64);
  await selectFiles(page, ['landscape.jpg']);
  const compressed = await runAndDownload(page, card);
  const original = await readFile('tests/fixtures/landscape.jpg');
  expect(compressed.length).toBeLessThan(original.length);
  await mkdir('.cache', { recursive: true });
  await writeFile(
    `.cache/compression-${testInfo.project.name}.json`,
    JSON.stringify({
      fixture: 'landscape.jpg',
      original: original.length,
      compressed: compressed.length,
      quality: 75,
    }),
  );
  await testInfo.attach('compression-measurement', {
    body: JSON.stringify({
      fixture: 'self-created landscape, 1600x1000',
      original: original.length,
      compressed: compressed.length,
      quality: 75,
    }),
    contentType: 'application/json',
  });
});

test('cancel active and queued image jobs; settings and mobile layout remain usable', async ({
  page,
}) => {
  await page.goto('./');
  await selectFiles(page, ['landscape.jpg', 'landscape.jpg']);
  const cards = page.getByTestId('image-card');
  for (const card of await cards.all())
    await card
      .getByRole('combobox', { name: '處理動作', exact: true })
      .selectOption('image-trace');
  await cards.first().getByLabel('描摹預設').selectOption('many');
  await page.getByRole('button', { name: '處理全部待辦' }).click();
  await cards.nth(1).getByRole('button', { name: '取消此檔' }).click();
  await cards.first().getByRole('button', { name: '取消此檔' }).click();
  for (const card of await cards.all())
    await expect(card.getByTestId('job-status')).toHaveText(
      '已取消，請重新選檔',
    );
  await page.getByRole('button', { name: /設定/ }).click();
  await page.getByLabel('外觀主題').selectOption('light');
  await page.getByLabel('介面語言').selectOption('en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
