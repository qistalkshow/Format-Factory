import { PDFDocument, StandardFonts } from 'pdf-lib';
import { readFile, writeFile } from 'node:fs/promises';
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const image = await pdf.embedPng(
  await readFile('tests/fixtures/transparent.png'),
);
for (let n = 1; n <= 2; n++) {
  const page = pdf.addPage([612, 792]);
  for (let row = 0; row < 60; row++)
    page.drawText(`Page ${n} question ${row + 1}: editable text`, {
      x: 40,
      y: 750 - row * 12,
      size: 12,
      font,
    });
  page.drawImage(image, { x: 420, y: 550, width: 120, height: 80 });
  page.drawImage(image, { x: 420, y: 350, width: 120, height: 80 });
}
await writeFile('tests/fixtures/image-anchors.pdf', await pdf.save());
