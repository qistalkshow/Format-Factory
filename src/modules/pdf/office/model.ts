export const OFFICE_LIMITS = {
  input: 32 * 1024 ** 2,
  expanded: 64 * 1024 ** 2,
  entry: 16 * 1024 ** 2,
  entries: 2000,
  pages: 100,
  cells: 20000,
  text: 1_000_000,
};
export const officeMimes = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
export type OfficeKind = keyof typeof officeMimes;
export interface TextCell {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  font?: string;
  runs?: TextCell[];
}
export interface TextLine {
  cells: TextCell[];
  y: number;
  size: number;
}
export interface InlineText {
  text: string;
  color?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  script?: 'sup' | 'sub';
}
export type Block =
  | {
      kind: 'text';
      text: string;
      size?: number;
      bold?: boolean;
      runs?: InlineText[];
    }
  | {
      kind: 'table';
      rows: string[][];
      runs?: InlineText[][][];
      widths?: number[];
    }
  | { kind: 'image'; bytes: Uint8Array; mime: string }
  | { kind: 'break' };
export function textLines(items: TextCell[]): TextLine[] {
  if (items.length > 20000) throw new Error('officeLimit');
  const lines: TextLine[] = [];
  for (const item of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (!item.text.trim()) continue;
    if (![item.x, item.y, item.width, item.size].every(Number.isFinite))
      throw new Error('corrupt');
    const last = lines.at(-1);
    if (
      last &&
      Math.abs(last.y - item.y) <=
        Math.max(2, Math.min(last.size, item.size) * 0.3)
    )
      last.cells.push(item);
    else lines.push({ cells: [item], y: item.y, size: item.size });
  }
  // 較小且緊鄰正文的升降基線視為同一行；不跨越欄間距離合併。
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const neighbor = [lines[i - 1], lines[i + 1]].find(
      (candidate) =>
        candidate &&
        line.size < candidate.size * 0.85 &&
        Math.abs(line.y - candidate.y) <= candidate.size * 0.7 &&
        line.cells.every((a) =>
          candidate.cells.some(
            (b) =>
              Math.max(a.x - b.x - b.width, b.x - a.x - a.width) <=
              candidate.size,
          ),
        ),
    );
    if (neighbor) {
      neighbor.cells.push(...line.cells);
      lines.splice(i--, 1);
    }
  }
  for (const line of lines) {
    const cells: TextCell[] = [];
    for (const cell of line.cells.sort((a, b) => a.x - b.x)) {
      const last = cells.at(-1),
        gap = last ? cell.x - last.x - last.width : Infinity;
      if (last && gap < Math.max(12, cell.size * 1.4)) {
        last.runs ??= [{ ...last }];
        last.runs.push({
          ...cell,
          text: (gap > cell.size * 0.15 ? ' ' : '') + cell.text,
        });
        last.text += (gap > cell.size * 0.15 ? ' ' : '') + cell.text;
        last.width = Math.max(last.width, cell.x + cell.width - last.x);
      } else cells.push({ ...cell });
    }
    line.cells = cells;
  }
  return lines;
}
export function tableRows(lines: TextLine[]): string[][] | undefined {
  if (
    lines.length < 2 ||
    lines.some((l) => l.cells.length < 2 || l.cells.length > 32)
  )
    return;
  const columns = lines[0].cells.map((c) => c.x);
  if (
    lines.some(
      (l) =>
        l.cells.length !== columns.length ||
        l.cells.some((c, i) => Math.abs(c.x - columns[i]) > 10),
    )
  )
    return;
  return lines.map((l) => l.cells.map((c) => c.text));
}
export function blocksFromLines(lines: TextLine[]): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length;) {
    let end = i + 1;
    while (
      end < lines.length &&
      lines[i].cells.length >= 2 &&
      lines[i].cells.length <= 32 &&
      lines[end].cells.length === lines[i].cells.length &&
      lines[end].cells.every(
        (cell, col) => Math.abs(cell.x - lines[i].cells[col].x) <= 10,
      )
    )
      end++;
    const rows = tableRows(lines.slice(i, end));
    if (rows) blocks.push({ kind: 'table', rows });
    else
      blocks.push({
        kind: 'text',
        text: lines[i].cells.map((c) => c.text).join(' '),
        size: lines[i].size,
        bold: lines[i].cells.some((c) => c.bold),
      });
    i = end;
  }
  return blocks;
}
export function guardBlocks(blocks: Block[]) {
  let text = 0,
    cells = 0,
    images = 0;
  for (const block of blocks) {
    if (block.kind === 'text') text += block.text.length;
    if (block.kind === 'image') images += block.bytes.length;
    if (block.kind === 'table')
      for (const row of block.rows) {
        cells += row.length;
        for (const cell of row) text += cell.length;
      }
  }
  if (
    text > OFFICE_LIMITS.text ||
    cells > OFFICE_LIMITS.cells ||
    images > OFFICE_LIMITS.expanded ||
    blocks.length > 20000
  )
    throw new Error('officeLimit');
}
