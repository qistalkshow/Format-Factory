import { prepareOfflineAssets } from '@/core/prepare-offline';
export async function preparePdfOffline(
  signal: AbortSignal,
  onProgress: (p: number) => void,
) {
  if (!navigator.serviceWorker?.controller) throw new Error('offline');
  await prepareOfflineAssets(
    new URL(import.meta.env.BASE_URL, location.origin),
    'pdf-assets.json',
    signal,
    onProgress,
    4,
  );
}
