import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';

// 自製幾何 F 圖示，以 PNG 標準編碼；不需要額外影像相依。
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([header, payload, crc]);
}
for (const size of [192, 512]) {
  const rows = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = (x * 512) / size,
        sy = (y * 512) / size;
      const foreground =
        sx >= 160 &&
        sy >= 144 &&
        sy < 368 &&
        (sx < 208 ||
          (sy < 192 && sx < 368) ||
          (sy >= 240 && sy < 288 && sx < 336));
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      rows.set(foreground ? [103, 232, 249] : [11, 20, 32], offset);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  await writeFile(
    `public/icons/icon-${size}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(rows)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
