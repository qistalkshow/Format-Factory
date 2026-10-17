import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { selectFiles, runAndDownload, pixels } from './image-helpers';

test('JPEG to PNG and custom background conversions preserve dimensions and colors', async ({
  page,
}) => {
  await page.goto('./');
  await selectFiles(page, ['colors.jpg']);
  const card = page.getByTestId('image-card');
  await card
    .getByRole('combobox', { name: '處理動作', exact: true })
    .selectOption('image-to-png');
  const png = await runAndDownload(page, card);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const info = await pixels(page, png, 'image/png');
  expect([info.width, info.height]).toEqual([64, 40]);
  expect(info.color[0]).toBeGreaterThan(240);
  await selectFiles(page, ['transparent.png']);
  await card
    .getByRole('combobox', { name: '處理動作', exact: true })
    .selectOption('image-to-jpeg');
  await card.getByLabel('透明區域背景色').fill('#ff0000');
  await card.getByLabel('輸出寬度').fill('32');
  const jpeg = await runAndDownload(page, card);
  const small = await pixels(page, jpeg, 'image/jpeg');
  expect([small.width, small.height]).toEqual([32, 20]);
  expect(small.color[0]).toBeGreaterThan(240);
  expect(small.color[1]).toBeLessThan(20);
});

test('larger compression result can retain original and invalidates an existing ZIP', async ({
  page,
}) => {
  await page.goto('./');
  await selectFiles(page, ['colors.jpg']);
  const card = page.getByTestId('image-card');
  await card.getByLabel('JPEG 品質').fill('100');
  await runAndDownload(page, card);
  await expect(card.getByLabel('使用原檔作為下載與 ZIP 結果')).toBeVisible();
  await page.getByRole('button', { name: '打包已完成結果 ZIP' }).click();
  await expect(page.getByRole('link', { name: '下載 ZIP' })).toBeVisible();
  await card.getByLabel('使用原檔作為下載與 ZIP 結果').check();
  await expect(page.getByRole('link', { name: '下載 ZIP' })).toHaveCount(0);
  const original = await readFile('tests/fixtures/colors.jpg');
  const event = page.waitForEvent('download');
  await card.getByRole('link', { name: '下載原檔' }).click();
  expect(await readFile((await (await event).path())!)).toEqual(original);
  await page.getByRole('button', { name: '打包已完成結果 ZIP' }).click();
  const zipEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: '下載 ZIP' }).click();
  const zipped = unzipSync(await readFile((await (await zipEvent).path())!));
  expect(Buffer.from(zipped['1-colors.jpg'])).toEqual(original);
});
