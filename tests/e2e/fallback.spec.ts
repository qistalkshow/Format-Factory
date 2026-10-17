import { test, expect } from './fixtures';
import { supportsRasterWorker } from './capabilities';
import { selectFiles } from './image-helpers';
test('unsupported Worker canvas gives a clear error instead of hanging', async ({
  page,
}) => {
  test.skip(
    await supportsRasterWorker(page),
    'Worker canvas is supported; covered by real conversion tests.',
  );
  await page.goto('./');
  await selectFiles(page, ['transparent.png']);
  const card = page.getByTestId('image-card');
  await card.getByRole('button', { name: '開始處理', exact: true }).click();
  await expect(card.getByRole('alert')).toContainText('瀏覽器缺少所需');
  await expect(card.getByTestId('job-status')).toHaveText('處理失敗');
});
