export function pngChunks(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: {
    type: string;
    start: number;
    end: number;
    data: Uint8Array;
  }[] = [];
  for (let offset = 8; offset < bytes.length;) {
    if (offset + 12 > bytes.length) throw new Error('corrupt');
    const length = view.getUint32(offset);
    const end = offset + length + 12;
    if (end > bytes.length) throw new Error('corrupt');
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    chunks.push({
      type,
      start: offset,
      end,
      data: bytes.subarray(offset + 8, end - 4),
    });
    offset = end;
    if (type === 'IEND') break;
  }
  if (chunks.at(-1)?.type !== 'IEND') throw new Error('corrupt');
  return chunks;
}
export function jpegSegments(bytes: Uint8Array) {
  const segments: {
    marker: number;
    start: number;
    end: number;
    data: Uint8Array;
  }[] = [];
  let offset = 2;
  while (offset < bytes.length) {
    const start = offset;
    if (bytes[offset++] !== 255) throw new Error('corrupt');
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) throw new Error('corrupt');
    const size = bytes[offset] * 256 + bytes[offset + 1];
    const end = offset + size;
    if (size < 2 || end > bytes.length) throw new Error('corrupt');
    segments.push({
      marker,
      start,
      end,
      data: bytes.subarray(offset + 2, end),
    });
    offset = end;
  }
  return segments;
}
export function pngChunk(
  type: string,
  data: Uint8Array,
): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(data.length + 12);
  const view = new DataView(result.buffer);
  view.setUint32(0, data.length);
  result.set(new TextEncoder().encode(type), 4);
  result.set(data, 8);
  let crc = 0xffffffff;
  for (const byte of result.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  view.setUint32(result.length - 4, (crc ^ 0xffffffff) >>> 0);
  return result;
}
