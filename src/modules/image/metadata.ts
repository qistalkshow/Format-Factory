import { jpegSegments, pngChunks, pngChunk } from './binary';
import { normalizeExif } from './exif';
import type { RasterMime } from './inspect';
const decoder = new TextDecoder();
const encoder = new TextEncoder();
function normalizeXmp(bytes: Uint8Array, width: number, height: number) {
  let text = decoder.decode(bytes);
  for (const [key, value] of [
    ['tiff:Orientation', 1],
    ['tiff:ImageWidth', width],
    ['tiff:ImageLength', height],
    ['exif:PixelXDimension', width],
    ['exif:PixelYDimension', height],
  ] as const) {
    text = text
      .replace(new RegExp(`(${key}=["'])[^"']*(["'])`, 'g'), `$1${value}$2`)
      .replace(new RegExp(`(<${key}>)[^<]*(</${key}>)`, 'g'), `$1${value}$2`);
  }
  return encoder.encode(text);
}
export async function preserveMetadata(
  original: Uint8Array,
  output: Blob,
  mime: RasterMime,
  width: number,
  height: number,
): Promise<Blob> {
  const additions: Uint8Array<ArrayBuffer>[] = [];
  if (mime === 'image/jpeg') {
    for (const segment of jpegSegments(original)) {
      let data = new Uint8Array(segment.data);
      if (
        segment.marker === 0xe1 &&
        decoder.decode(data.subarray(0, 6)) === 'Exif\0\0'
      ) {
        data.set(normalizeExif(data.subarray(6), width, height), 6);
      } else if (
        segment.marker === 0xe1 &&
        decoder.decode(data.subarray(0, 29)) ===
          'http://ns.adobe.com/xap/1.0/\0'
      ) {
        data = normalizeXmp(data, width, height);
      } else if (![0xed, 0xfe].includes(segment.marker)) continue;
      if (data.length > 65533) throw new Error('metadataInvalid');
      const block = new Uint8Array(data.length + 4);
      block.set([
        255,
        segment.marker,
        (data.length + 2) >> 8,
        (data.length + 2) & 255,
      ]);
      block.set(data, 4);
      additions.push(block);
    }
    if (additions.reduce((n, a) => n + a.length, 0) > 4 * 1024 ** 2)
      throw new Error('metadataInvalid');
    return new Blob([output.slice(0, 2), ...additions, output.slice(2)], {
      type: mime,
    });
  }
  for (const chunk of pngChunks(original)) {
    if (['tEXt', 'zTXt', 'iTXt'].includes(chunk.type))
      additions.push(pngChunk(chunk.type, chunk.data));
    if (chunk.type === 'eXIf')
      additions.push(
        pngChunk(chunk.type, normalizeExif(chunk.data, width, height)),
      );
  }
  if (additions.reduce((n, a) => n + a.length, 0) > 4 * 1024 ** 2)
    throw new Error('metadataInvalid');
  // 色彩已經由 Canvas 轉為 sRGB，不回填原 ICC profile。
  return new Blob([output.slice(0, 33), ...additions, output.slice(33)], {
    type: mime,
  });
}
