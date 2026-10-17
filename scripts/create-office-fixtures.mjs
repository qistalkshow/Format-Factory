import { readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  ImageRun,
  HeadingLevel,
} from 'docx';
import ExcelJS from 'exceljs';
import pptxgen from 'pptxgenjs';
const png = await readFile('tests/fixtures/transparent.png');
const pdf = await PDFDocument.create(),
  font = await pdf.embedFont(StandardFonts.Helvetica),
  bold = await pdf.embedFont(StandardFonts.HelveticaBold),
  page = pdf.addPage([595, 842]);
page.drawText('SELF CREATED OFFICE', { x: 40, y: 780, size: 24, font: bold });
page.drawText('Editable paragraph for conversion.', {
  x: 40,
  y: 740,
  size: 12,
  font,
});
for (const [i, row] of [
  ['Item', 'Value'],
  ['Alpha', '12'],
  ['Beta', '34'],
].entries())
  for (const [j, text] of row.entries())
    page.drawText(text, { x: 40 + j * 200, y: 690 - i * 25, size: 12, font });
const image = await pdf.embedPng(png);
page.drawImage(image, { x: 40, y: 350, width: 200, height: 125 });
await writeFile('tests/fixtures/office-source.pdf', await pdf.save());
const doc = new Document({
  creator: 'SELF_CREATED_TEST',
  sections: [
    {
      children: [
        new Paragraph({
          text: '自製測試文件',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [
            new TextRun('Local document — 中文內容 <script> inert text'),
          ],
        }),
        new Table({
          rows: [
            ['Item', 'Value'],
            ['Alpha', '12'],
          ].map(
            (row) =>
              new TableRow({
                children: row.map(
                  (text) => new TableCell({ children: [new Paragraph(text)] }),
                ),
              }),
          ),
        }),
        new Paragraph({
          children: [
            new ImageRun({
              type: 'png',
              data: png,
              transformation: { width: 200, height: 125 },
            }),
          ],
        }),
      ],
    },
  ],
});
await writeFile(
  'tests/fixtures/office-source.docx',
  await Packer.toBuffer(doc),
);
const book = new ExcelJS.Workbook();
book.creator = 'SELF_CREATED_TEST';
const sheet = book.addWorksheet('自製工作表');
sheet.addRows([
  ['Item', 'Value'],
  ['Alpha', 12],
  ['Beta', 34],
  ['Total', { formula: 'SUM(B2:B3)', result: 46 }],
]);
sheet.getColumn(1).width = 25;
await writeFile(
  'tests/fixtures/office-source.xlsx',
  new Uint8Array(await book.xlsx.writeBuffer()),
);
sheet.getCell('B4').value = { formula: 'SUM(B2:B3)' };
await writeFile(
  'tests/fixtures/office-formula.xlsx',
  new Uint8Array(await book.xlsx.writeBuffer()),
);
const deck = new pptxgen();
deck.layout = 'LAYOUT_WIDE';
deck.author = 'SELF_CREATED_TEST';
const slide = deck.addSlide();
slide.addText('自製投影片 / LOCAL', {
  x: 0.5,
  y: 0.5,
  w: 10,
  h: 1,
  fontSize: 24,
  color: '000000',
});
slide.addImage({
  data: `image/png;base64,${png.toString('base64')}`,
  x: 0.5,
  y: 2,
  w: 4,
  h: 2.5,
});
slide.addText('Simple slide', {
  x: 6,
  y: 2,
  w: 5,
  h: 1,
  fontSize: 20,
  color: '003344',
});
await writeFile(
  'tests/fixtures/office-source.pptx',
  new Uint8Array(await deck.write({ outputType: 'arraybuffer' })),
);
console.log('Created original PDF, DOCX, XLSX and PPTX fixtures.');
