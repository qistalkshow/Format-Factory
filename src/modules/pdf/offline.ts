export async function preparePdfOffline(
  signal: AbortSignal,
  onProgress: (p: number) => void,
) {
  if (!navigator.serviceWorker?.controller) throw new Error('offline');
  const root = new URL(import.meta.env.BASE_URL, location.origin);
  const response = await fetch(new URL('pdf-assets.json', root), { signal });
  if (!response.ok) throw new Error('offline');
  const manifest: unknown = await response.json();
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !('paths' in manifest) ||
    !Array.isArray(manifest.paths) ||
    !manifest.paths.every((p) => typeof p === 'string')
  )
    throw new Error('offline');
  const paths = manifest.paths as string[];
  for (const [i, path] of paths.entries()) {
    const url = new URL(path, root);
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname))
      throw new Error('offline');
    const asset = await fetch(url, { signal });
    if (!asset.ok) throw new Error('offline');
    await asset.arrayBuffer();
    onProgress((i + 1) / paths.length);
  }
}
