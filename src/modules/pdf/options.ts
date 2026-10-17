import type { OfficeOperation } from './office/pdf-office-engine';
export const PDF_LIMITS = {
  bytes: 64 * 1024 ** 2,
  batch: 128 * 1024 ** 2,
  pages: 300,
  pixels: 12_000_000,
  side: 8192,
  output: 256 * 1024 ** 2,
};
export type PdfOperation =
  'merge' | 'split' | 'compress' | 'pptx' | OfficeOperation;
export interface PdfOptions {
  splitMode: 'range' | 'every' | 'selected';
  ranges: string;
  every: number;
  selected: number[];
  preset: 'low' | 'medium' | 'high';
  password: string;
  docxMode: 'editable' | 'appearance';
}
export const pdfDefaults: PdfOptions = {
  splitMode: 'range',
  ranges: '1',
  every: 1,
  selected: [],
  preset: 'medium',
  password: '',
  docxMode: 'editable',
};
export function parsePdfOptions(value: unknown): PdfOptions {
  if (!value || typeof value !== 'object') throw new Error('options');
  const o = { ...pdfDefaults, ...value };
  if (
    !['range', 'every', 'selected'].includes(o.splitMode) ||
    !['low', 'medium', 'high'].includes(o.preset) ||
    !['editable', 'appearance'].includes(o.docxMode) ||
    typeof o.ranges !== 'string' ||
    o.ranges.length > 4096 ||
    !Number.isInteger(o.every) ||
    o.every < 1 ||
    o.every > PDF_LIMITS.pages ||
    typeof o.password !== 'string' ||
    o.password.length > 1024 ||
    !Array.isArray(o.selected) ||
    o.selected.length > PDF_LIMITS.pages ||
    o.selected.some((n) => !Number.isInteger(n) || n < 1)
  )
    throw new Error('options');
  return o;
}
export function pageRanges(text: string, count: number): number[] {
  const pages = new Set<number>();
  if (!text.trim() || text.length > 4096) throw new Error('range');
  for (const part of text.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('range');
    const first = Number(match[1]),
      last = Number(match[2] ?? match[1]);
    if (first < 1 || last < first || last > count) throw new Error('range');
    for (let n = first; n <= last; n++) pages.add(n);
  }
  return [...pages].sort((a, b) => a - b);
}
export function splitGroups(options: PdfOptions, count: number): number[][] {
  if (!Number.isInteger(count) || count < 1 || count > PDF_LIMITS.pages)
    throw new Error('limit');
  if (options.splitMode === 'every')
    return Array.from({ length: Math.ceil(count / options.every) }, (_, i) =>
      Array.from(
        { length: Math.min(options.every, count - i * options.every) },
        (_, j) => i * options.every + j + 1,
      ),
    );
  const selected =
    options.splitMode === 'range'
      ? pageRanges(options.ranges, count)
      : [...new Set(options.selected)].sort((a, b) => a - b);
  if (!selected.length || selected.some((n) => n < 1 || n > count))
    throw new Error('range');
  return [selected];
}
export function pdfPreset(preset: PdfOptions['preset']) {
  return {
    low: { dpi: 144, quality: 0.88 },
    medium: { dpi: 110, quality: 0.72 },
    high: { dpi: 72, quality: 0.5 },
  }[preset];
}
export function renderDimensions(width: number, height: number, scale: number) {
  if (![width, height, scale].every((n) => Number.isFinite(n) && n > 0))
    throw new Error('limit');
  const w = Math.ceil(width * scale),
    h = Math.ceil(height * scale);
  if (w * h > PDF_LIMITS.pixels || w > PDF_LIMITS.side || h > PDF_LIMITS.side)
    throw new Error('limit');
  return { width: w, height: h };
}
