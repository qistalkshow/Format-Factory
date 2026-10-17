import { test, expect } from './pdf-helpers';

test('M5 keyboard navigation, help, privacy and translated settings', async ({
  page,
}) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳至主要內容' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('button', { name: '使用說明', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '使用說明', exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('heading', { name: '首次使用與離線準備' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '隱私說明', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '網路連線的範圍' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '回到首頁' }).click();
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.getByLabel('介面語言').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Three steps' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('M5 themes meet text and control contrast; small viewport respects reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  for (const theme of ['dark', 'light']) {
    await page.getByLabel('外觀主題').selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const contrast = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      const luminance = (name: string) => {
        const value = css.getPropertyValue(name).trim().slice(1);
        const hex =
          value.length === 3 ? [...value].map((c) => c + c).join('') : value;
        const c = [0, 2, 4]
          .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
          .map((n) =>
            n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
          );
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
      };
      const ratio = (a: string, b: string) => {
        const x = luminance(a),
          y = luminance(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      return {
        text: ratio('--text', '--panel'),
        muted: ratio('--muted', '--panel'),
        accent: ratio('--accent', '--panel'),
        button: ratio('--accent', '--ink'),
        border: ratio('--line', '--panel'),
      };
    });
    for (const key of ['text', 'muted', 'accent', 'button'] as const)
      expect(contrast[key]).toBeGreaterThanOrEqual(4.5);
    expect(contrast.border).toBeGreaterThanOrEqual(3);
  }
  await page.getByRole('button', { name: '回到首頁' }).click();
  await expect(page.getByTestId('dropzone')).toHaveCSS(
    'transition-duration',
    '0s',
  );
  for (const category of [/PDF 開啟/, /圖片 開啟/, /影片音訊 開啟/]) {
    await page.getByRole('button', { name: category }).click();
    await expect(page.locator('main > div > div[role=region]')).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test.describe('M5 rendering failure recovery', () => {
  test.use({ serviceWorkers: 'block' });
  test('M5 failed module download provides reload or explicit browser recovery', async ({
    page,
    browserName,
  }) => {
    let requests = 0;
    let blocked = true;
    await page.route('**/assets/PdfWorkspace-*.js', (route) => {
      requests++;
      return blocked
        ? route.fulfill({
            status: 503,
            headers: { 'Cache-Control': 'no-store' },
            body: 'test outage',
          })
        : route.continue();
    });
    await page.goto('./');
    await page.getByRole('button', { name: /PDF 開啟/ }).click();
    await expect(page.getByRole('alert')).toContainText('工具載入失敗');
    blocked = false;
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: '重新整理（需重新選檔）' }).click(),
    ]);
    await page.getByRole('button', { name: /PDF 開啟/ }).click();
    const workspace = page.getByRole('heading', { name: 'PDF 工作區' });
    await expect(workspace.or(page.getByRole('alert'))).toBeVisible();
    if (await workspace.isVisible()) expect(requests).toBeGreaterThanOrEqual(2);
    else {
      // Windows WebKit 會跨重新整理保留失敗的模組；驗證明確的重開提示。
      expect(browserName).toBe('webkit');
      await expect(page.getByRole('alert')).toContainText('關閉所有本站分頁');
      await page.getByRole('button', { name: '使用說明', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: '三個步驟' }),
      ).toBeVisible();
    }
  });
  test('M5 a broken tool retains the shell and can be cleared', async ({
    page,
  }) => {
    await page.route('**/assets/ImageWorkspace-*.js', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: 'export default function Broken(){throw new Error("test-only")} ',
      }),
    );
    await page.goto('./');
    await page.getByRole('button', { name: /圖片 開啟/ }).click();
    await expect(page.getByRole('alert')).toContainText('未預期錯誤');
    await page.getByRole('button', { name: '清除工作並返回首頁' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await page.getByRole('button', { name: /PDF 開啟/ }).click();
    await expect(
      page.getByRole('heading', { name: 'PDF 工作區' }),
    ).toBeVisible();
  });
});
