import { mkdir, cp, copyFile } from 'node:fs/promises';
const target = 'public/pdf-engine';
await mkdir(target, { recursive: true });
for (const name of ['cmaps', 'standard_fonts', 'wasm', 'iccs'])
  await cp(`node_modules/pdfjs-dist/${name}`, `${target}/${name}`, {
    recursive: true,
  });
await copyFile(
  'node_modules/pdfjs-dist/build/pdf.min.mjs',
  `${target}/pdf.mjs`,
);
await copyFile(
  'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  `${target}/pdf.worker.mjs`,
);
await copyFile('node_modules/pdfjs-dist/LICENSE', `${target}/LICENSE`);
// 以官方 OFL 2.1.5 版本替換 npm 套件內的舊 GPL 字型及其授權。
for (const style of ['Regular', 'Bold', 'Italic', 'BoldItalic'])
  await copyFile(
    `vendor/liberation-sans/LiberationSans-${style}.ttf`,
    `${target}/standard_fonts/LiberationSans-${style}.ttf`,
  );
await copyFile(
  'vendor/liberation-sans/LICENSE',
  `${target}/standard_fonts/LICENSE_LIBERATION`,
);
