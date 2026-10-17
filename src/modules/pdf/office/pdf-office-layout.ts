import { officeBitmap } from './bitmap';
import { PDFDocument } from 'pdf-lib';
import { OFFICE_LIMITS, guardBlocks, type Block } from './model';
import { styledLines, drawStyledLine } from './inline-text';
import type { FlowPage } from './docx-page';
export function wrapText(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  width: number,
): string[] {
  const lines: string[] = [];
  for (const part of text.split(/\r?\n/)) {
    let line = '';
    for (const char of part) {
      if (line && ctx.measureText(line + char).width > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
    lines.push(line);
  }
  return lines;
}
export async function canvasPdfPage(
  pdf: PDFDocument,
  canvas: OffscreenCanvas,
  width: number,
  height: number,
) {
  if (pdf.getPageCount() >= OFFICE_LIMITS.pages) throw new Error('officeLimit');
  const blob = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality: 0.92,
  });
  const image = await pdf.embedJpg(await blob.arrayBuffer());
  pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
}
export async function flowPdf(
  blocks: Block[],
  progress: (p: number) => void,
  layout: FlowPage = {
    width: 595,
    height: 842,
    left: 42,
    right: 42,
    top: 42,
    bottom: 42,
  },
): Promise<Blob> {
  guardBlocks(blocks);
  if (typeof OffscreenCanvas === 'undefined') throw new Error('browser');
  const pdf = await PDFDocument.create(),
    canvas = new OffscreenCanvas(
      Math.ceil(layout.width * 2),
      Math.ceil(layout.height * 2),
    ),
    ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('browser');
  const { width, height, left: margin, top, bottom } = layout,
    usable = width - margin - layout.right;
  let y = top,
    drawn = false;
  function reset() {
    ctx!.setTransform(2, 0, 0, 2, 0, 0);
    ctx!.fillStyle = '#ffffff';
    ctx!.fillRect(0, 0, width, height);
    ctx!.textBaseline = 'top';
    y = top;
    drawn = false;
  }
  const flush = async () => {
    if (drawn) await canvasPdfPage(pdf, canvas, width, height);
    reset();
  };
  const space = async (h: number) => {
    if (y + h > height - bottom) await flush();
  };
  reset();
  try {
    for (const [index, block] of blocks.entries()) {
      if (block.kind === 'break') await flush();
      if (block.kind === 'text') {
        const size = Math.max(9, Math.min(28, block.size ?? 12));
        const lines = styledLines(
          ctx,
          block.runs ?? [{ text: block.text }],
          size,
          usable,
          block.bold,
        );
        for (const line of lines) {
          await space(size * 1.45);
          ctx.fillStyle = '#111111';
          drawStyledLine(ctx, line, margin, y, size);
          y += size * 1.45;
          drawn = true;
        }
        y += 7;
      }
      if (block.kind === 'table') {
        const columns = Math.max(...block.rows.map((r) => r.length));
        // 寬表以欄帶分頁，避免直接裁掉超出紙張的欄位。
        for (let start = 0; start < columns; start += 6) {
          if (start) await flush();
          const count = Math.min(6, columns - start),
            cw = usable / count;
          for (const [rowIndex, row] of block.rows.entries()) {
            ctx.font = '10px sans-serif';
            const cells = Array.from({ length: count }, (_, i) =>
              styledLines(
                ctx,
                block.runs?.[rowIndex]?.[start + i] ?? [
                  { text: row[start + i] ?? '' },
                ],
                10,
                cw - 10,
              ),
            );
            const lineCount = Math.max(1, ...cells.map((c) => c.length));
            const perPage = Math.max(
              1,
              Math.floor((height - top - bottom - 10) / 14),
            );
            for (let line = 0; line < lineCount; line += perPage) {
              const visible = Math.min(perPage, lineCount - line),
                rh = visible * 14 + 10;
              await space(rh);
              ctx.font = '10px sans-serif';
              ctx.strokeStyle = '#777777';
              ctx.lineWidth = 0.5;
              ctx.fillStyle = '#111111';
              for (let col = 0; col < count; col++) {
                ctx.strokeRect(margin + col * cw, y, cw, rh);
                cells[col]
                  .slice(line, line + visible)
                  .forEach((text, k) =>
                    drawStyledLine(
                      ctx,
                      text,
                      margin + col * cw + 5,
                      y + 5 + k * 14,
                      10,
                    ),
                  );
              }
              y += rh;
              drawn = true;
            }
          }
          y += 10;
        }
      }
      if (block.kind === 'image') {
        if (!['image/png', 'image/jpeg'].includes(block.mime))
          throw new Error('officeUnsupported');
        const image = await officeBitmap(block.bytes, block.mime);
        try {
          if (image.width * image.height > 12_000_000)
            throw new Error('officeLimit');
          const scale = Math.min(
              1,
              usable / image.width,
              (height - top - bottom) / image.height,
            ),
            w = image.width * scale,
            h = image.height * scale;
          await space(h);
          ctx.drawImage(image, margin, y, w, h);
          y += h + 10;
          drawn = true;
        } finally {
          image.close();
        }
      }
      progress(0.35 + ((index + 1) / blocks.length) * 0.5);
    }
    await flush();
    if (!pdf.getPageCount()) throw new Error('noOfficeContent');
    return new Blob([new Uint8Array(await pdf.save())], {
      type: 'application/pdf',
    });
  } finally {
    canvas.width = canvas.height = 0;
  }
}
