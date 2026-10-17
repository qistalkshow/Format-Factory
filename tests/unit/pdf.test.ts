import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import {
  pdfDefaults,
  pageRanges,
  splitGroups,
  pdfPreset,
  renderDimensions,
  parsePdfOptions,
} from '../../src/modules/pdf/options';
import { processPdf } from '../../src/modules/pdf/pdf-engine';
const fixture = async (name: string) =>
  new Blob([await readFile(`tests/fixtures/${name}`)], {
    type: 'application/pdf',
  });
describe('PDF boundaries and presets', () => {
  it('parses and deduplicates bounded page ranges', () => {
    expect(pageRanges('1-3,2,5', 5)).toEqual([1, 2, 3, 5]);
    for (const text of ['', '0', '6', '3-1', '-2', '1.5', '1,', '1-99999999'])
      expect(() => pageRanges(text, 5)).toThrow();
  });
  it('groups by interval and selected pages', () => {
    expect(
      splitGroups({ ...pdfDefaults, splitMode: 'every', every: 2 }, 5),
    ).toEqual([[1, 2], [3, 4], [5]]);
    expect(
      splitGroups(
        { ...pdfDefaults, splitMode: 'selected', selected: [3, 1, 3] },
        3,
      ),
    ).toEqual([[1, 3]]);
    expect(() =>
      splitGroups({ ...pdfDefaults, splitMode: 'selected' }, 3),
    ).toThrow();
  });
  it('rejects unsafe options and pixels', () => {
    expect(() => parsePdfOptions({ ...pdfDefaults, every: 0 })).toThrow();
    expect(() => renderDimensions(10000, 10000, 1)).toThrow();
    expect(() => renderDimensions(0, 50, 1)).toThrow();
    expect(renderDimensions(300, 400, 2)).toEqual({ width: 600, height: 800 });
    expect(pdfPreset('high')).toEqual({ dpi: 72, quality: 0.5 });
    expect(pdfPreset('low').quality).toBeGreaterThan(
      pdfPreset('medium').quality,
    );
  });
});
describe('real PDF page operations', () => {
  it('merges in specified order and preserves rotation', async () => {
    const values: number[] = [];
    const result = await processPdf(
      {
        action: 'merge',
        files: [await fixture('rotated.pdf'), await fixture('pages.pdf')],
        options: pdfDefaults,
      },
      (p) => values.push(p),
    );
    const doc = await PDFDocument.load(await result.blobs[0].arrayBuffer());
    expect(doc.getPageCount()).toBe(4);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
    expect(doc.getPage(1).getWidth()).toBe(300);
    expect(values.at(-1)).toBe(1);
  });
  it('splits into correctly sized groups', async () => {
    const result = await processPdf(
      {
        action: 'split',
        files: [await fixture('pages.pdf')],
        options: { ...pdfDefaults, splitMode: 'every', every: 2 },
      },
      () => {},
    );
    expect(result.blobs).toHaveLength(2);
    expect(
      await Promise.all(
        result.blobs.map(async (b) =>
          (await PDFDocument.load(await b.arrayBuffer())).getPageCount(),
        ),
      ),
    ).toEqual([2, 1]);
  });
  it('rejects encrypted and corrupt documents without bypassing encryption', async () => {
    await expect(
      processPdf(
        {
          action: 'merge',
          files: [await fixture('encrypted.pdf')],
          options: pdfDefaults,
        },
        () => {},
      ),
    ).rejects.toThrow('encrypted');
    await expect(
      processPdf(
        {
          action: 'split',
          files: [await fixture('corrupt.pdf')],
          options: pdfDefaults,
        },
        () => {},
      ),
    ).rejects.toThrow('corrupt');
  });
});
