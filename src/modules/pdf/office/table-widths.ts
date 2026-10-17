export function columnWidths(widths: number[], available: number): number[] {
  if (
    !widths.length ||
    !widths.every((w) => Number.isFinite(w) && w > 0) ||
    !Number.isFinite(available) ||
    available < widths.length * 12
  )
    throw new Error('officeUnsupported');
  // 最少留 12 pt，避免極窄欄產生負的文字寬度；寬表縮放仍保留相對比例。
  const base = widths.map((w) => Math.max(12, w));
  const total = base.reduce((a, b) => a + b, 0);
  if (total <= available) return base;
  const remaining = available - base.length * 12;
  const excess = total - base.length * 12;
  return base.map((w) => 12 + ((w - 12) / excess) * remaining);
}
