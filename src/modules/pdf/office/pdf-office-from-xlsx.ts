import ExcelJS from 'exceljs';
import { zipSync } from 'fflate';
import { openOffice } from './archive';
import { OFFICE_LIMITS, type Block, type InlineText } from './model';
import { flowPdf } from './pdf-office-layout';
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
    sheet.eachRow((row) => {
      const cells: string[] = [];
      const styled: InlineText[][] = [];
      for (let col = 1; col <= sheet.columnCount; col++) {
        const cell = row.getCell(col);
        count++;
        if (count > OFFICE_LIMITS.cells) throw new Error('officeLimit');
        if (cell.isMerged && cell.master.address !== cell.address) {
          cells.push('');
          styled.push([]);
          continue;
        }
        const value = cell.value;
        if (
          value &&
          typeof value === 'object' &&
          ('formula' in value || 'sharedFormula' in value) &&
          value.result === undefined
        )
          throw new Error('officeFormula');
        cells.push(cell.text);
        const fragments =
          value && typeof value === 'object' && 'richText' in value
            ? value.richText
            : [{ text: cell.text, font: cell.font }];
        styled.push(
          fragments.map((part) => {
            const font = part.font ?? cell.font;
            return {
              text: part.text,
              bold: font?.bold,
              italic: font?.italic,
              underline: Boolean(font?.underline),
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
      { kind: 'table', rows, runs },
    );
  }
  return flowPdf(blocks, progress);
}
