import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { writeFile, readFile } from 'node:fs/promises';
const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
for (let i = 1; i <= 3; i++) {
  const page = doc.addPage(i === 3 ? [400, 300] : [300, 400]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
    color: rgb(i === 1 ? 1 : 0, i === 2 ? 1 : 0, i === 3 ? 1 : 0),
  });
  page.drawText(`SELF CREATED PAGE ${i}`, {
    x: 20,
    y: 150,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });
}
await writeFile('tests/fixtures/pages.pdf', await doc.save());
const other = await PDFDocument.create();
const p = other.addPage([200, 400]);
p.drawText('FOURTH PAGE');
p.setRotation(degrees(90));
await writeFile('tests/fixtures/rotated.pdf', await other.save());
const scan = await PDFDocument.create();
const photo = await scan.embedJpg(
  await readFile('tests/fixtures/landscape.jpg'),
);
scan
  .addPage([800, 500])
  .drawImage(photo, { x: 0, y: 0, width: 800, height: 500 });
await writeFile('tests/fixtures/scan.pdf', await scan.save());
await writeFile('tests/fixtures/corrupt.pdf', '%PDF-1.7\nThis is not a PDF.');
const oversized = await PDFDocument.create();
oversized.addPage([20000, 20000]);
await writeFile('tests/fixtures/large-page.pdf', await oversized.save());
doc.addJavaScript('untrusted', 'app.alert("must not execute");');
await writeFile('tests/fixtures/script.pdf', await doc.save());
