import ExcelJS from 'exceljs';
import { openPdf } from '../pdf-renderer';
import { pageText, guardDocument } from './pdf-office-extract';
import { blocksFromLines, officeMimes, OFFICE_LIMITS } from './model';
export async function pdfXlsx(
  file: Blob,
  password: string,
  progress: (p: number) => void,
) {
  const { doc, close } = await openPdf(file, password);
  try {
    guardDocument(doc);
    const book = new ExcelJS.Workbook();
    book.creator = 'FormatFactory';
    let count = 0;
    let text = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n),
        lines = await pageText(page),
        sheet = book.addWorksheet(`Page ${n}`);
      for (const block of blocksFromLines(lines)) {
        const rows =
          block.kind === 'table'
            ? block.rows
            : block.kind === 'text'
              ? [[block.text]]
              : [];
        for (const row of rows) {
          count += row.length;
          text += row.reduce((n, cell) => n + cell.length, 0);
          if (text > OFFICE_LIMITS.text) throw new Error('officeLimit');
          if (count > OFFICE_LIMITS.cells) throw new Error('officeLimit');
          sheet.addRow(row);
        }
      }
      // 沒有文字的頁面尚未建立欄位，ExcelJS 此時回傳 null。
      sheet.columns?.forEach((column) => {
        column.width = 28;
        column.alignment = { wrapText: true, vertical: 'top' };
      });
      page.cleanup();
      progress(0.1 + (n / doc.numPages) * 0.75);
    }
    if (!count) throw new Error('noOfficeContent');
    return new Blob([new Uint8Array(await book.xlsx.writeBuffer())], {
      type: officeMimes.xlsx,
    });
  } finally {
    await close();
  }
}
