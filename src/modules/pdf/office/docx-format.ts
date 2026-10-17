import { TextRun, type ISectionPropertiesOptions } from 'docx';
import type { TextCell, TextLine } from './model';

export function docxRuns(cells: TextCell[], baseline: number) {
  return cells.flatMap((cell, index) => [
    ...(index ? [new TextRun('\t')] : []),
    ...(cell.runs ?? [cell]).map(
      (run) =>
        new TextRun({
          text: run.text,
          bold: run.bold,
          italics: run.italic,
          underline: run.underline ? {} : undefined,
          color: '000000',
          font: run.font,
          size: Math.round(run.size * 2),
          // PDF 只有基線座標；用實際升降點數，避免 Word 上下標再次縮小字級。
          position:
            Math.abs(baseline - run.y) > 1
              ? `${baseline - run.y}pt`
              : undefined,
        }),
    ),
  ]);
}

export function pageGeometry(width: number, height: number, lines: TextLine[]) {
  if (![width, height].every((v) => Number.isFinite(v) && v > 0 && v <= 1584))
    throw new Error('officeLimit');
  const cells = lines.flatMap((line) => line.cells);
  // PDF 不記錄 Word 邊界，以文字範圍估計；不能把推定值稱為原始邊界。
  const left = cells.length
    ? Math.max(0, Math.min(width / 4, ...cells.map((c) => c.x)))
    : 0;
  const top = cells.length
    ? Math.max(0, Math.min(height / 4, ...cells.map((c) => c.y - c.size)))
    : 0;
  const properties: ISectionPropertiesOptions = {
    page: {
      // docx 會在 landscape 時交換寬高，因此先傳入直向尺寸。
      size: {
        width: Math.round(Math.min(width, height) * 20),
        height: Math.round(Math.max(width, height) * 20),
        orientation: width > height ? 'landscape' : 'portrait',
      },
      margin: {
        left: Math.round(left * 20),
        top: Math.round(top * 20),
        right: 0,
        bottom: 0,
        header: 0,
        footer: 0,
      },
    },
  };
  return { properties, left, top };
}
