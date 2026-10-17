import { checkDimensions, MAX_FILE_BYTES } from './options';
import { jpegSegments, pngChunks } from './binary';
export type RasterMime = 'image/png' | 'image/jpeg';
export function inspectRaster(bytes: Uint8Array): {
  mime: RasterMime;
  width: number;
  height: number;
} {
  if (bytes.length > MAX_FILE_BYTES) throw new Error('tooLarge');
  if (
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  ) {
    const chunks = pngChunks(bytes);
    if (chunks.some((c) => c.type === 'acTL')) throw new Error('animated');
    if (chunks[0]?.type !== 'IHDR' || chunks[0].data.length !== 13)
      throw new Error('corrupt');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16),
      height = view.getUint32(20);
    checkDimensions(width, height);
    return { mime: 'image/png', width, height };
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    const frame = jpegSegments(bytes).find((s) =>
      [0xc0, 0xc1, 0xc2].includes(s.marker),
    );
    if (!frame || frame.data.length < 6) throw new Error('corrupt');
    const height = frame.data[1] * 256 + frame.data[2],
      width = frame.data[3] * 256 + frame.data[4];
    checkDimensions(width, height);
    return { mime: 'image/jpeg', width, height };
  }
  if (String.fromCharCode(...bytes.subarray(0, 3)) === 'GIF')
    throw new Error('animated');
  throw new Error('corrupt');
}
