import { writeFile, readFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import ExcelJS from 'exceljs';
import pptxgen from 'pptxgenjs';
const pdf = await PDFDocument.create();
const normal = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
const image = await pdf.embedPng(
  await readFile('tests/fixtures/transparent.png'),
);
const page = pdf.addPage([612, 792]);
page.drawText('FORMATTING FIXTURE', { x: 54, y: 738, size: 24, font: bold });
let x = 54;
for (const [text, font] of [
  ['Normal ', normal],
  ['Bold ', bold],
  ['Italic', italic],
]) {
  page.drawText(text, { x, y: 690, size: 16, font });
  x += font.widthOfTextAtSize(text, 16);
}
page.drawText('x', { x: 54, y: 650, size: 16, font: normal });
page.drawText('2', { x: 62, y: 656, size: 10, font: normal });
page.drawText('H', { x: 100, y: 650, size: 16, font: normal });
page.drawText('2', { x: 112, y: 646, size: 10, font: normal });
page.drawText('O', { x: 118, y: 650, size: 16, font: normal });
page.drawText('Underlined', { x: 54, y: 610, size: 16, font: normal });
page.drawLine({
  start: { x: 54, y: 608 },
  end: { x: 133, y: 608 },
  thickness: 1,
});
page.drawImage(image, { x: 300, y: 450, width: 160, height: 100 });
page.drawImage(image, { x: 300, y: 300, width: 80, height: 50 });
page.drawRectangle({
  x: 54,
  y: 400,
  width: 140,
  height: 70,
  color: rgb(0, 0.7, 0.8),
});
const landscape = pdf.addPage([792, 612]);
landscape.drawText('LANDSCAPE PAGE', { x: 72, y: 540, size: 20, font: bold });
await writeFile('tests/fixtures/formatting.pdf', await pdf.save());
const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { left: 1080, right: 1080, top: 720, bottom: 720 },
        },
      },
      children: [
        new Paragraph({
          children: [
            new TextRun('Normal '),
            new TextRun({ text: 'Bold ', bold: true }),
            new TextRun({ text: 'Italic ', italics: true }),
            new TextRun({ text: 'Underlined ', underline: {} }),
            new TextRun('x'),
            new TextRun({ text: '2', superScript: true }),
            new TextRun(' H'),
            new TextRun({ text: '2', subScript: true }),
            new TextRun('O'),
          ],
        }),
      ],
    },
  ],
});
await writeFile('tests/fixtures/formatting.docx', await Packer.toBuffer(doc));
const book = new ExcelJS.Workbook();
const sheet = book.addWorksheet('Formatting');
sheet.getCell('A1').value = {
  richText: [
    { text: 'Normal ' },
    { text: 'Bold ', font: { bold: true } },
    { text: 'Italic ', font: { italic: true } },
    { text: 'Underlined ', font: { underline: true } },
    { text: 'x' },
    { text: '2', font: { vertAlign: 'superscript' } },
  ],
};
await writeFile(
  'tests/fixtures/formatting.xlsx',
  Buffer.from(await book.xlsx.writeBuffer()),
);
const presentation = new pptxgen();
presentation
  .addSlide()
  .addText(
    [
      { text: 'Normal ' },
      { text: 'Bold ', options: { bold: true } },
      { text: 'Italic ', options: { italic: true } },
      { text: 'Underlined ', options: { underline: true } },
      { text: 'x' },
      { text: '2', options: { superscript: true } },
    ],
    { x: 0.75, y: 0.75, w: 8, h: 1, fontSize: 24 },
  );
await writeFile(
  'tests/fixtures/formatting.pptx',
  await presentation.write({ outputType: 'nodebuffer' }),
);
