import ExcelJS from 'exceljs';
import { zipSync } from 'fflate';
import { openOffice } from './archive';
import { OFFICE_LIMITS, type Block, type InlineText } from './model';
import { flowPdf } from './pdf-office-layout';
import { spreadsheetText } from './xlsx-format';
export async function xlsxPdf(file: Blob, progress: (p: number) => void) {
  const archive = await openOffice(file, 'xlsx');
  if (Object.keys(archive).some((p) => /^xl\/(?:charts|drawings)\//.test(p)))
    throw new Error('officeUnsupported');
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(new Uint8Array(zipSync(archive)).buffer);
  progress(0.25);
  const blocks: Block[] = [];
  let count = 0;
  for (const sheet of book.worksheets) {
    if (sheet.state !== 'visible') continue;
    if (sheet.rowCount > 5000 || sheet.columnCount > 100)
      throw new Error('officeLimit');
    const rows: string[][] = [];
    const runs: InlineText[][][] = [];
    const columns = Array.from({ length: sheet.columnCount }, (_, i) =>
      sheet.getColumn(i + 1),
    ).filter((column) => !column.hidden);
    if (!columns.length) continue;
    sheet.eachRow((row) => {
      if (row.hidden) return;
      const cells: string[] = [];
      const styled: InlineText[][] = [];
      for (const column of columns) {
        const cell = row.getCell(column.number);
        count++;
        if (count > OFFICE_LIMITS.cells) throw new Error('officeLimit');
        if (cell.isMerged && cell.master.address !== cell.address) {
          cells.push('');
          styled.push([]);
          continue;
        }
        const value = cell.value;
        const display = spreadsheetText(cell);
        cells.push(display.text);
        const fragments =
          value && typeof value === 'object' && 'richText' in value
            ? value.richText
            : [{ text: display.text, font: cell.font }];
        styled.push(
          fragments.map((part) => {
            const font = part.font ?? cell.font;
            return {
              text: part.text,
              bold: font?.bold,
              italic: font?.italic,
              underline: Boolean(font?.underline),
              color:
                display.color ??
                (font?.color?.argb && /^[\da-f]{8}$/i.test(font.color.argb)
                  ? `#${font.color.argb.slice(2)}`
                  : undefined),
              script:
                font?.vertAlign === 'superscript'
                  ? 'sup'
                  : font?.vertAlign === 'subscript'
                    ? 'sub'
                    : undefined,
            };
          }),
        );
      }
      rows.push(cells);
      runs.push(styled);
    });
    if (!rows.length) continue;
    if (blocks.length) blocks.push({ kind: 'break' });
    blocks.push(
      { kind: 'text', text: sheet.name, size: 18, bold: true },
      {
        kind: 'table',
        rows,
        runs,
        widths: columns.map((column) => (column.width ?? 8.43) * 5.25 + 3.75),
      },
    );
  }
  return flowPdf(blocks, progress);
}
