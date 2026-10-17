import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { pngChunk } from '../src/modules/image/binary.ts';
/* global document */
const root = 'tests/fixtures/';
// 全部素材由本腳本繪製，不使用照片庫或使用者檔案。
const width = 64,
  height = 40;
const raw = Buffer.alloc((width * 4 + 1) * height);
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++) {
    const p = y * (width * 4 + 1) + 1 + x * 4;
    raw.set(
      x < 32 ? [0, 0, 0, 0] : y < 20 ? [0, 255, 0, 255] : [0, 0, 255, 255],
      p,
    );
  }
const header = Buffer.alloc(13);
header.writeUInt32BE(width, 0);
header.writeUInt32BE(height, 4);
header[8] = 8;
header[9] = 6;
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([
  signature,
  pngChunk('IHDR', header),
  pngChunk('tEXt', Buffer.from('Comment\0Synthetic private metadata')),
  pngChunk('IDAT', deflateSync(raw, { level: 0 })),
  pngChunk('IEND', new Uint8Array()),
]);
await writeFile(root + 'transparent.png', png);
const oversized = Buffer.from(header);
oversized.writeUInt32BE(100000, 0);
await writeFile(
  root + 'oversized.png',
  Buffer.concat([
    signature,
    pngChunk('IHDR', oversized),
    pngChunk('IEND', new Uint8Array()),
  ]),
);
const animation = Buffer.alloc(8);
animation.writeUInt32BE(2);
await writeFile(
  root + 'animated.png',
  Buffer.concat([
    png.subarray(0, 33),
    pngChunk('acTL', animation),
    png.subarray(33),
  ]),
);
await writeFile(
  root + 'shape.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40" viewBox="0 0 64 40"><rect x="32" width="32" height="40" fill="#00ff00"/></svg>',
);
await writeFile(
  root + 'unsafe.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40"><script>globalThis.svgExecuted=true</script><image href="https://example.com/tracker.png"/></svg>',
);
await writeFile(root + 'corrupt.png', 'This is not a PNG.');
await writeFile(root + 'animation.gif', 'GIF89a');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const images = await page.evaluate(() => {
    const small = document.createElement('canvas');
    small.width = 64;
    small.height = 40;
    const s = small.getContext('2d');
    s.fillStyle = '#ff0000';
    s.fillRect(0, 0, 32, 20);
    s.fillStyle = '#00ff00';
    s.fillRect(32, 0, 32, 20);
    s.fillStyle = '#0000ff';
    s.fillRect(0, 20, 32, 20);
    s.fillStyle = '#ffff00';
    s.fillRect(32, 20, 32, 20);
    const scene = document.createElement('canvas');
    scene.width = 1600;
    scene.height = 1000;
    const ctx = scene.getContext('2d');
    const pixels = ctx.createImageData(1600, 1000);
    let seed = 12345;
    for (let y = 0; y < 1000; y++)
      for (let x = 0; x < 1600; x++) {
        seed = (1664525 * seed + 1013904223) >>> 0;
        const noise = (seed / 4294967296 - 0.5) * 34;
        const hill = 530 + Math.sin(x / 210) * 95 + Math.cos(x / 65) * 20;
        const color =
          y < hill
            ? [90 + y * 0.1, 155 + y * 0.04, 225 - y * 0.05]
            : [45 + y * 0.02, 95 + (1000 - y) * 0.05, 40];
        const p = (y * 1600 + x) * 4;
        pixels.data.set(
          [...color.map((n) => Math.max(0, Math.min(255, n + noise))), 255],
          p,
        );
      }
    ctx.putImageData(pixels, 0, 0);
    return [
      small.toDataURL('image/jpeg', 0.98),
      scene.toDataURL('image/jpeg', 0.98),
    ];
  });
  const jpeg = Buffer.from(images[0].split(',')[1], 'base64');
  await writeFile(root + 'colors.jpg', jpeg);
  await writeFile(
    root + 'landscape.jpg',
    Buffer.from(images[1].split(',')[1], 'base64'),
  );
  for (let orientation = 1; orientation <= 8; orientation++) {
    const tiff = Buffer.alloc(88);
    tiff.write('II');
    tiff.writeUInt16LE(42, 2);
    tiff.writeUInt32LE(8, 4);
    tiff.writeUInt16LE(2, 8);
    tiff.writeUInt16LE(0x112, 10);
    tiff.writeUInt16LE(3, 12);
    tiff.writeUInt32LE(1, 14);
    tiff.writeUInt16LE(orientation, 18);
    tiff.writeUInt16LE(0x8825, 22);
    tiff.writeUInt16LE(4, 24);
    tiff.writeUInt32LE(1, 26);
    tiff.writeUInt32LE(38, 30);
    tiff.writeUInt16LE(2, 38);
    tiff.writeUInt16LE(1, 40);
    tiff.writeUInt16LE(2, 42);
    tiff.writeUInt32LE(2, 44);
    tiff.write('N', 48);
    tiff.writeUInt16LE(2, 52);
    tiff.writeUInt16LE(5, 54);
    tiff.writeUInt32LE(3, 56);
    tiff.writeUInt32LE(68, 60);
    // 合成 GPS 緯度；不是任何使用者的位置。
    const gps = Buffer.alloc(24);
    gps.writeUInt32LE(25, 0);
    gps.writeUInt32LE(1, 4);
    gps.writeUInt32LE(1, 12);
    gps.writeUInt32LE(1, 20);
    const body = Buffer.concat([
      Buffer.from('Exif\0\0'),
      tiff.subarray(0, 68),
      gps,
    ]);
    const marker = Buffer.from([
      255,
      225,
      (body.length + 2) >> 8,
      (body.length + 2) & 255,
    ]);
    await writeFile(
      root + `orientation-${orientation}.jpg`,
      Buffer.concat([jpeg.subarray(0, 2), marker, body, jpeg.subarray(2)]),
    );
  }
} finally {
  await browser.close();
}
