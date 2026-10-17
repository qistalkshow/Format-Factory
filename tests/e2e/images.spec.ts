import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';
import { pngChunks } from '../../src/modules/image/binary';
import { selectFiles, runAndDownload, pixels } from './image-helpers';
import { startStaticServer } from './static-server';
import { unzipSync } from 'fflate';

test('drop image, offline JPEG conversion, white transparency, no external requests', async ({
  page,
  context,
  baseURL,
}) => {
  const server = await startStaticServer(new URL(baseURL!).pathname);
  const external: string[] = [],
    wasm: string[] = [];
  context.on('request', (r) => {
    if (new URL(r.url()).origin !== new URL(server.url).origin)
      external.push(r.url());
    if (r.url().endsWith('.wasm')) wasm.push(r.url());
  });
  try {
    await page.goto(server.url);
    await expect(page.getByTestId('offline-status')).toHaveText(
      '基礎離線資源已就緒',
    );
    expect(wasm).toEqual([]);
    await page.reload();
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );
    await server.close();
    expect((await page.reload())?.fromServiceWorker()).toBe(true);
    const bytes = await readFile('tests/fixtures/transparent.png');
    const transfer = await page.evaluateHandle((base64) => {
      const data = new DataTransfer();
      data.items.add(
        new File(
          [Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))],
          'transparent.png',
          { type: 'image/png' },
        ),
      );
      return data;
    }, bytes.toString('base64'));
    await page
      .getByTestId('dropzone')
      .dispatchEvent('drop', { dataTransfer: transfer });
    await transfer.dispose();
    const card = page.getByTestId('image-card');
    await card
      .getByRole('combobox', { name: '處理動作', exact: true })
      .selectOption('image-to-jpeg');
    const output = await runAndDownload(page, card);
    expect([...output.subarray(0, 2)]).toEqual([255, 216]);
    const info = await pixels(page, output, 'image/jpeg');
    expect([info.width, info.height]).toEqual([64, 40]);
    expect(info.color.slice(0, 3).every((c) => c > 245)).toBe(true);
    expect(external).toEqual([]);
    expect(wasm).toEqual([]);
  } finally {
    await server.close();
  }
});

test('PNG WASM compression strips metadata, compares, caches engine for offline reuse', async ({
  page,
  context,
  baseURL,
}) => {
  const server = await startStaticServer(new URL(baseURL!).pathname);
  const external: string[] = [],
    wasm: string[] = [];
  context.on('request', (r) => {
    if (new URL(r.url()).origin !== new URL(server.url).origin)
      external.push(r.url());
    if (r.url().endsWith('.wasm')) wasm.push(r.url());
  });
  await page.addInitScript(() =>
    document.addEventListener('securitypolicyviolation', () => {
      document.documentElement.dataset.cspViolation = 'yes';
    }),
  );
  try {
    await page.goto(server.url);
    await expect(page.getByTestId('offline-status')).toHaveText(
      '基礎離線資源已就緒',
    );
    await page.reload();
    expect(wasm).toEqual([]);
    await selectFiles(page, ['transparent.png']);
    const card = page.getByTestId('image-card');
    const output = await runAndDownload(page, card);
    expect(wasm.some((url) => url.includes('oxipng'))).toBe(true);
    expect(wasm.some((url) => url.includes('mozjpeg'))).toBe(false);
    expect([...output.subarray(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(
      pngChunks(output).some((c) => ['tEXt', 'eXIf'].includes(c.type)),
    ).toBe(false);
    expect(output.length).toBeLessThan(
      (await readFile('tests/fixtures/transparent.png')).length / 2,
    );
    await card.getByRole('button', { name: '前後對比', exact: true }).click();
    await card.getByLabel('對比位置').fill('25');
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-csp-violation',
      'yes',
    );
    await server.close();
    await page.reload();
    await selectFiles(page, ['transparent.png']);
    await card.getByLabel('保留中繼資料', { exact: true }).check();
    const kept = await runAndDownload(page, card);
    expect(pngChunks(kept).some((c) => c.type === 'tEXt')).toBe(true);
    expect(external).toEqual([]);
  } finally {
    await server.close();
  }
});

test('SVG rasterization respects size and background; unsafe SVG never executes', async ({
  page,
  context,
  baseURL,
}) => {
  const external: string[] = [];
  context.on('request', (r) => {
    if (new URL(r.url()).origin !== new URL(baseURL!).origin)
      external.push(r.url());
  });
  await page.goto('./');
  await selectFiles(page, ['shape.svg']);
  const card = page.getByTestId('image-card');
  await card.getByLabel('SVG 縮放倍率').selectOption('2');
  const output = await runAndDownload(page, card);
  const info = await pixels(page, output, 'image/png');
  expect([info.width, info.height, info.color[3]]).toEqual([128, 80, 0]);
  await selectFiles(page, ['shape.svg']);
  await card
    .getByRole('combobox', { name: '處理動作', exact: true })
    .selectOption('image-to-jpeg');
  await card.getByLabel('輸出寬度').fill('32');
  await card.getByLabel('透明區域背景色').fill('#ff0000');
  const jpeg = await pixels(
    page,
    await runAndDownload(page, card),
    'image/jpeg',
  );
  expect([jpeg.width, jpeg.height]).toEqual([32, 20]);
  expect(jpeg.color[0]).toBeGreaterThan(240);
  expect(jpeg.color[1]).toBeLessThan(20);
  await selectFiles(page, ['unsafe.svg']);
  await card.getByRole('button', { name: '開始處理', exact: true }).click();
  await expect(card.getByRole('alert')).toContainText('SVG 含腳本');
  expect(await page.evaluate(() => 'svgExecuted' in globalThis)).toBe(false);
  expect(external).toEqual([]);
});

test('tracing generates parseable SVG and batch ZIP has distinct names', async ({
  page,
}) => {
  await page.goto('./');
  await selectFiles(page, ['transparent.png', 'transparent.png']);
  const cards = page.getByTestId('image-card');
  for (const card of await cards.all())
    await card
      .getByRole('combobox', { name: '處理動作', exact: true })
      .selectOption('image-trace');
  await cards.first().getByLabel('描摹預設').selectOption('mono');
  await page.getByRole('button', { name: '處理全部待辦' }).click();
  for (const card of await cards.all())
    await expect(card.getByTestId('job-status')).toHaveText('處理完成', {
      timeout: 30000,
    });
  await page.getByRole('button', { name: '打包已完成結果 ZIP' }).click();
  const event = page.waitForEvent('download');
  await page.getByRole('link', { name: '下載 ZIP' }).click();
  const zip = unzipSync(await readFile((await (await event).path())!));
  expect(Object.keys(zip)).toEqual(['1-transparent.svg', '2-transparent.svg']);
  const svg = new TextDecoder().decode(Object.values(zip)[0]);
  expect(
    await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      return (
        doc.documentElement.localName === 'svg' &&
        !doc.querySelector('parsererror') &&
        !!doc.querySelector('path')
      );
    }, svg),
  ).toBe(true);
});

test('malformed, oversized, GIF and APNG inputs show actionable errors', async ({
  page,
}) => {
  await page.goto('./');
  await selectFiles(page, [
    'corrupt.png',
    'oversized.png',
    'animation.gif',
    'animated.png',
  ]);
  await page.getByRole('button', { name: '處理全部待辦' }).click();
  const cards = page.getByTestId('image-card');
  for (const [i, text] of [
    '圖片損毀',
    '安全上限',
    '不支援 GIF',
    '不支援 GIF',
  ].entries())
    await expect(cards.nth(i).getByRole('alert')).toContainText(text);
});
