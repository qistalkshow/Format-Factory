import type { PDFPageProxy, PageViewport } from 'pdfjs-dist';
import type { TextLine } from './model';

// PDF 沒有底線文字屬性。僅辨識與整個文字片段等寬、緊貼基線的細水平描邊；
// 不把寬表格框線或斜線誤認為底線。依目前鎖定的 PDF.js 6 constructPath 格式。
export function markUnderlines(
  lines: TextLine[],
  list: Awaited<ReturnType<PDFPageProxy['getOperatorList']>>,
  ops: Record<string, number>,
  view: PageViewport,
) {
  let matrix = new DOMMatrix();
  let lineWidth = 1;
  const widths: number[] = [];
  const stack: DOMMatrix[] = [];
  const strokes: { x: number; y: number; width: number }[] = [];
  for (let i = 0; i < list.fnArray.length; i++) {
    const op = list.fnArray[i],
      args = list.argsArray[i];
    if (op === ops.save || op === ops.paintFormXObjectBegin) {
      stack.push(DOMMatrix.fromMatrix(matrix));
      widths.push(lineWidth);
    }
    if (op === ops.restore || op === ops.paintFormXObjectEnd) {
      matrix = stack.pop() ?? new DOMMatrix();
      lineWidth = widths.pop() ?? 1;
    }
    if (op === ops.setLineWidth) lineWidth = Number(args[0]);
    if (op === ops.transform)
      matrix = matrix.multiply(new DOMMatrix(args as number[]));
    if (op === ops.paintFormXObjectBegin && args[0])
      matrix = matrix.multiply(new DOMMatrix(args[0] as number[]));
    if (op !== ops.constructPath || args[0] !== ops.stroke) continue;
    if (lineWidth * Math.hypot(matrix.c, matrix.d) > 2.5) continue;
    const bounds: unknown = args[2];
    if (
      !bounds ||
      typeof bounds !== 'object' ||
      !('length' in bounds) ||
      bounds.length !== 4
    )
      continue;
    const [x1, y1, x2, y2] = Array.from(bounds as ArrayLike<number>);
    if (Math.abs(y2 - y1) > 0.1) continue;
    const a = matrix.transformPoint({ x: x1, y: y1 }),
      b = matrix.transformPoint({ x: x2, y: y2 });
    const start = view.convertToViewportPoint(a.x, a.y),
      end = view.convertToViewportPoint(b.x, b.y);
    if (Math.abs(start[1] - end[1]) > 0.5) continue;
    strokes.push({
      x: Math.min(start[0], end[0]),
      y: start[1],
      width: Math.abs(end[0] - start[0]),
    });
    if (strokes.length > 20000) throw new Error('officeLimit');
  }
  // 依縱座標索引，避免每個字片段掃描所有線條。
  const rows = new Map<number, typeof strokes>();
  for (const stroke of strokes) {
    const key = Math.floor(stroke.y / 8);
    const row = rows.get(key) ?? [];
    if (row.length >= 512) throw new Error('officeLimit');
    row.push(stroke);
    rows.set(key, row);
  }
  for (const line of lines)
    for (const cell of line.cells) {
      const first = Math.floor(cell.y / 8),
        last = Math.floor((cell.y + Math.min(4, cell.size * 0.3)) / 8);
      for (let row = first; row <= last; row++) {
        if (
          (rows.get(row) ?? []).some(
            (stroke) =>
              stroke.y >= cell.y &&
              stroke.y - cell.y <= Math.min(4, cell.size * 0.3) &&
              Math.abs(stroke.x - cell.x) < 3 &&
              Math.abs(stroke.width - cell.width) < 5,
          )
        ) {
          cell.underline = true;
          for (const run of cell.runs ?? []) run.underline = true;
        }
      }
    }
}
