import { describe, expect, it } from 'vitest';
import { detectFileType } from '@/core/file-type';
import { formatSize } from '@/core/format-size';
import { ConverterRegistry, type Converter } from '@/core/converter';
import { isWorkerResponse } from '@/core/worker-protocol';

describe('file classification', () => {
  it.each([
    ['PHOTO.JPG', '', 'image/jpeg', 'image'],
    ['file.pdf', 'application/pdf', 'application/pdf', 'pdf'],
    ['file.png', 'application/pdf', 'application/pdf', 'pdf'],
    ['music.M4A', 'application/octet-stream', 'audio/mp4', 'media'],
    ['audio.mp3', '', 'audio/mpeg', 'media'],
    ['video.mp4', '', 'video/mp4', 'media'],
    ['picture.svg', 'IMAGE/SVG+XML; charset=utf-8', 'image/svg+xml', 'image'],
    [
      'table.xlsx',
      '',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'office',
    ],
    [
      'document.docx',
      '',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'office',
    ],
    [
      'slides.pptx',
      '',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'office',
    ],
    ['no-extension', '', 'application/octet-stream', 'unknown'],
    ['bad.exe', 'text/html', 'application/octet-stream', 'unknown'],
    ['photo.png.exe', '', 'application/octet-stream', 'unknown'],
  ])('%s / %s', (name, type, mime, category) => {
    expect(detectFileType({ name, type })).toEqual({ mime, category });
  });
});
describe('byte sizes', () => {
  it.each([
    [0, '0 B'],
    [1, '1 B'],
    [1023, '1023 B'],
    [1024, '1 KiB'],
    [1536, '1.5 KiB'],
    [1024 ** 3, '1 GiB'],
  ])('%s', (value, expected) => expect(formatSize(value)).toBe(expected));
  it.each([-1, Infinity, NaN])('rejects %s', (value) =>
    expect(() => formatSize(value)).toThrow(RangeError),
  );
});
it('registry rejects duplicates and unknown IDs, filters by MIME', () => {
  const registry = new ConverterRegistry();
  const converter: Converter = {
    id: 'test',
    from: ['image/png'],
    to: 'image/jpeg',
    tier: 1,
    run: async () => [],
  };
  registry.register(converter);
  expect(registry.get('test')).toBe(converter);
  expect(registry.forType('image/png')).toEqual([converter]);
  expect(registry.forType('application/pdf')).toEqual([]);
  expect(() => registry.register(converter)).toThrow();
  expect(() => registry.get('missing')).toThrow();
});
it('validates worker boundary messages', () => {
  for (const message of [
    null,
    {},
    { type: 'progress', value: NaN },
    { type: 'progress', value: 2 },
    { type: 'result', buffer: 'text' },
  ])
    expect(isWorkerResponse(message)).toBe(false);
  expect(isWorkerResponse({ type: 'result', blob: new Blob(['image']) })).toBe(
    true,
  );
});
