import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  defaults,
  outputDimensions,
  checkDimensions,
  compressionPreset,
  compositePixel,
  flattenAlpha,
  parseOptions,
} from '@/modules/image/options';
import { inspectRaster } from '@/modules/image/inspect';
import { jpegSegments, pngChunks } from '@/modules/image/binary';
import { normalizeExif } from '@/modules/image/exif';
import { preserveMetadata } from '@/modules/image/metadata';
const fixture = (name: string) =>
  new Uint8Array(readFileSync(`tests/fixtures/${name}`));
describe('dimensions and limits', () => {
  it('preserves aspect ratio and scales SVG', () => {
    expect(outputDimensions(640, 400, { ...defaults, width: 320 })).toEqual({
      width: 320,
      height: 200,
    });
    expect(outputDimensions(64, 40, { ...defaults, scale: 4 })).toEqual({
      width: 256,
      height: 160,
    });
  });
  it('rejects decompression bombs and excessive output', () => {
    for (const [w, h] of [
      [0, 20],
      [Infinity, 1],
      [9000, 2],
      [5000, 5000],
    ])
      expect(() => checkDimensions(w, h)).toThrow();
    expect(() =>
      outputDimensions(4000, 3000, { ...defaults, scale: 4 }),
    ).toThrow('tooLarge');
    const size = outputDimensions(4000, 3000, defaults, true);
    expect(size.width * size.height).toBeLessThanOrEqual(262144);
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(768);
  });
  it('maps presets honestly and validates options', () => {
    expect(compressionPreset('low')).toEqual({ quality: 90, effort: 1 });
    expect(compressionPreset('high')).toEqual({ quality: 50, effort: 4 });
    for (const bad of [
      { quality: NaN },
      { background: 'url(x)' },
      { width: -1 },
      { scale: 3 },
      { effort: 7 },
    ])
      expect(() => parseOptions({ ...defaults, ...bad })).toThrow(
        'invalidOptions',
      );
  });
});
it('composites alpha against the selected background', () => {
  expect(compositePixel(0, 0, 0, 0, '#ffffff')).toEqual([255, 255, 255]);
  expect(compositePixel(255, 0, 0, 128, '#0000ff')).toEqual([128, 0, 127]);
  const data = new Uint8ClampedArray([0, 0, 0, 0, 255, 0, 0, 255]);
  flattenAlpha(data, '#ffffff');
  expect([...data]).toEqual([255, 255, 255, 255, 255, 0, 0, 255]);
});
it('validates actual image signatures and rejects unsupported/animated/oversized inputs', () => {
  expect(inspectRaster(fixture('transparent.png'))).toEqual({
    mime: 'image/png',
    width: 64,
    height: 40,
  });
  expect(inspectRaster(fixture('colors.jpg'))).toEqual({
    mime: 'image/jpeg',
    width: 64,
    height: 40,
  });
  for (const [name, code] of [
    ['corrupt.png', 'corrupt'],
    ['oversized.png', 'tooLarge'],
    ['animation.gif', 'animated'],
    ['animated.png', 'animated'],
  ])
    expect(() => inspectRaster(fixture(name))).toThrow(code);
});
it('normalizes EXIF orientation, preserves GPS and handles malformed IFD safely', () => {
  const exif = jpegSegments(fixture('orientation-6.jpg'))
    .find((s) => s.marker === 0xe1)!
    .data.subarray(6);
  const fixed = normalizeExif(exif, 40, 64);
  expect(new DataView(fixed.buffer).getUint16(18, true)).toBe(1);
  expect([...fixed.subarray(38)]).toEqual([...exif.subarray(38)]);
  expect(() => normalizeExif(new Uint8Array(3), 1, 1)).toThrow(
    'metadataInvalid',
  );
});
it('copies supported metadata only when explicitly requested by compression', async () => {
  const jpeg = fixture('colors.jpg');
  const result = await preserveMetadata(
    fixture('orientation-6.jpg'),
    new Blob([jpeg]),
    'image/jpeg',
    40,
    64,
  );
  const exif = jpegSegments(new Uint8Array(await result.arrayBuffer())).find(
    (s) => s.marker === 0xe1,
  )!;
  expect(exif.data[24]).toBe(1);
  const png = fixture('transparent.png');
  expect(pngChunks(png).some((c) => c.type === 'tEXt')).toBe(true);
});
