import { expect, test } from 'vitest';
import ExcelJS from 'exceljs';
import { spreadsheetText } from '../../src/modules/pdf/office/xlsx-format';
import { columnWidths } from '../../src/modules/pdf/office/table-widths';
import { pptxRuns, drawPptxText } from '../../src/modules/pdf/office/pptx-text';
import { xml } from '../../src/modules/pdf/office/archive';
test('formats percentages, money, leading zeros and formula results without calculating formulas', () => {
  const cell = new ExcelJS.Workbook().addWorksheet('Test').getCell('A1');
  for (const [value, pattern, expected] of [
    [0.125, '0.00%', '12.50%'],
    [1234.5, '$#,##0.00', '$1,234.50'],
    [7, '0000', '0007'],
    [1.5, '# ?/?', '1 1/2'],
  ] as const) {
    cell.value = value;
    cell.numFmt = pattern;
    expect(spreadsheetText(cell).text).toBe(expected);
  }
  cell.value = { formula: '1/8', result: 0.125 };
  cell.numFmt = '0%';
  expect(spreadsheetText(cell).text).toBe('13%');
  cell.value = { formula: '1/8' };
  expect(() => spreadsheetText(cell)).toThrow('officeFormula');
});
test('keeps UTC dates including 1904 workbooks and does not shift by local timezone', async () => {
  const book = new ExcelJS.Workbook();
  book.properties.date1904 = true;
  const cell = book.addWorksheet('Dates').getCell('A1');
  cell.value = new Date('2026-10-17T00:00:00Z');
  cell.numFmt = 'yyyy-mm-dd';
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(await book.xlsx.writeBuffer());
  expect(spreadsheetText(restored.worksheets[0].getCell('A1')).text).toBe(
    '2026-10-17',
  );
});
test('keeps column widths within the page without making negative content widths', () => {
  expect(columnWidths([60, 180], 400)).toEqual([60, 180]);
  const widths = columnWidths([1, 1000, 10], 400);
  expect(widths.reduce((a, b) => a + b)).toBeCloseTo(400);
  expect(Math.min(...widths)).toBeGreaterThanOrEqual(12);
  expect(() => columnWidths([NaN], 400)).toThrow();
});
test('PPTX mixed font sizes and run formatting stay independent', () => {
  const paragraph = xml(
    '<a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:r><a:rPr sz="1200"/><a:t>Small</a:t></a:r><a:r><a:rPr sz="3200" b="1" i="1" u="sng"/><a:t>Large</a:t></a:r></a:p>',
  ).documentElement!;
  const runs = pptxRuns(paragraph);
  expect(runs[0]).toMatchObject({ text: 'Small', size: 12, bold: false });
  expect(runs[1]).toMatchObject({
    text: 'Large',
    size: 32,
    bold: true,
    italic: true,
    underline: true,
  });
});

test('PPTX text uses horizontal and vertical alignment inside its margins', () => {
  const node = xml(
    '<a:txBody xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:bodyPr anchor="ctr" lIns="127000" rIns="127000" tIns="127000" bIns="127000"/><a:p><a:pPr algn="ctr"/><a:r><a:rPr sz="1000"/><a:t>AB</a:t></a:r></a:p></a:txBody>',
  ).documentElement!;
  const drawn: number[][] = [];
  const context = {
    measureText: () => ({ width: 5 }),
    fillText: (_text: string, x: number, y: number) => drawn.push([x, y]),
    fillStyle: '#000000',
  } as unknown as OffscreenCanvasRenderingContext2D;
  drawPptxText(context, node, 100, 100);
  expect(drawn).toEqual([[45, 54]]);
  expect(() => drawPptxText(context, node, 100, 25)).toThrow(
    'officeUnsupported',
  );
});
