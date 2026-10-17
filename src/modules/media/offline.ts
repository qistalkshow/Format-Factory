export async function prepareMediaOffline(
  signal: AbortSignal,
  progress: (n: number) => void,
) {
  if (!navigator.serviceWorker?.controller) throw new Error('offline');
  const root = new URL(import.meta.env.BASE_URL, location.href);
  const response = await fetch(new URL('media-assets.json', root), { signal });
  if (!response.ok) throw new Error('offline');
  const data: { paths: string[] } = await response.json();
  if (!Array.isArray(data.paths) || !data.paths.length)
    throw new Error('offline');
  for (let i = 0; i < data.paths.length; i++) {
    const url = new URL(data.paths[i], root);
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname))
      throw new Error('offline');
    const asset = await fetch(url, { signal });
    if (!asset.ok) throw new Error('offline');
    await asset.arrayBuffer();
    progress((i + 1) / data.paths.length);
  }
}
