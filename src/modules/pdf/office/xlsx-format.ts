import type ExcelJS from 'exceljs';
import { format, formatColor } from 'numfmt';

export function spreadsheetText(cell: ExcelJS.Cell) {
  let value = cell.value;
  if (
    value &&
    typeof value === 'object' &&
    ('formula' in value || 'sharedFormula' in value)
  ) {
    if (value.result === undefined) throw new Error('officeFormula');
    value = value.result;
  }
  if (value === null || value === undefined) return { text: '' };
  if (typeof value === 'object' && !(value instanceof Date))
    return { text: cell.text };
  const pattern = cell.numFmt || 'General';
  if (pattern.length > 1024) throw new Error('officeLimit');
  try {
    // ExcelJS 日期已是 UTC，且已處理 1904 日期系統，不再依裝置時區偏移。
    const options = { ignoreTimezone: true, locale: 'en', throws: true };
    const text = format(pattern, value, options);
    if (text.length > 4096) throw new Error('officeLimit');
    const color = formatColor(pattern, value, options);
    return {
      text,
      color:
        typeof color === 'string' && /^#[\da-f]{6}$/i.test(color)
          ? color
          : undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'officeLimit') throw error;
    throw new Error('officeUnsupported', { cause: error });
  }
}
