export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0)
    throw new RangeError('Invalid byte count');
  if (bytes === 0) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${Number((bytes / 1024 ** Math.max(0, index)).toFixed(1))} ${units[Math.max(0, index)]}`;
}
