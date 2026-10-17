import { test as base, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
export { expect };
export const test = base.extend<{ pdfPrivacy: void }>({
  pdfPrivacy: [
    async ({ context, baseURL }, use, testInfo) => {
      const external: string[] = [];
      // 獨立離線主機案例自行檢查精確 origin；其他案例僅允許預覽主機。
      const ownMonitor =
        /PDF engines stay lazy|M4 prepared engines|M5 update/.test(
          testInfo.title,
        );
      context.on('request', (r) => {
        const url = new URL(r.url());
        if (
          !ownMonitor &&
          /^https?:$/.test(url.protocol) &&
          url.origin !== new URL(baseURL!).origin
        )
          external.push(r.url());
      });
      await use();
      expect(external).toEqual([]);
    },
    { auto: true },
  ],
});
export async function files(page: Page, names: string[]) {
  await page
    .locator('input[type=file]')
    .setInputFiles(names.map((n) => `tests/fixtures/${n}`));
  await expect(
    page.getByRole('combobox', { name: 'PDF 處理動作', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.pdf-controls')).toHaveCSS(
    'border-top-width',
    '0px',
  );
}
export async function dropPdfs(page: Page, names: string[]) {
  const payload = await Promise.all(
    names.map(async (name) => ({
      name,
      base64: (await readFile(`tests/fixtures/${name}`)).toString('base64'),
    })),
  );
  const transfer = await page.evaluateHandle((items) => {
    const data = new DataTransfer();
    for (const item of items)
      data.items.add(
        new File(
          [Uint8Array.from(atob(item.base64), (c) => c.charCodeAt(0))],
          item.name,
          { type: 'application/pdf' },
        ),
      );
    return data;
  }, payload);
  await page
    .getByTestId('dropzone')
    .dispatchEvent('drop', { dataTransfer: transfer });
  await transfer.dispose();
  await expect(page.locator('.pdf-controls')).toHaveCSS(
    'border-top-width',
    '0px',
  );
}
export async function run(page: Page) {
  await page
    .getByRole('button', { name: '開始 PDF 處理', exact: true })
    .click();
  await expect(page.getByTestId('pdf-status')).toHaveText('處理完成', {
    timeout: 30000,
  });
}
export async function download(page: Page, name: RegExp, index = 0) {
  const event = page.waitForEvent('download');
  await page.getByRole('link', { name }).nth(index).click();
  return readFile((await (await event).path())!);
}
