import { expect, type Page, type Locator } from '@playwright/test';
import { readFile } from 'node:fs/promises';
export async function selectFiles(page: Page, names: string[]) {
  await page
    .locator('input[type=file]')
    .setInputFiles(names.map((name) => `tests/fixtures/${name}`));
  await expect(page.getByTestId('image-card')).toHaveCount(names.length);
}
export async function runAndDownload(page: Page, card: Locator) {
  await card.getByRole('button', { name: '開始處理', exact: true }).click();
  await expect(card.getByTestId('job-status')).toHaveText('處理完成', {
    timeout: 30000,
  });
  const event = page.waitForEvent('download');
  await card.getByRole('link', { name: '下載結果', exact: true }).click();
  const download = await event;
  return readFile((await download.path())!);
}
export async function pixels(page: Page, bytes: Buffer, mime: string) {
  return page.evaluate(
    async ({ base64, mime }) => {
      const img = new Image();
      img.src = `data:${mime};base64,${base64}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const color = Array.from(
        ctx.getImageData(
          Math.min(5, canvas.width - 1),
          Math.min(5, canvas.height - 1),
          1,
          1,
        ).data,
      );
      return { width: canvas.width, height: canvas.height, color };
    },
    { base64: bytes.toString('base64'), mime },
  );
}
