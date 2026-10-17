import { PDFDocument } from 'pdf-lib';
import type { Element } from '@xmldom/xmldom';
import {
  openOffice,
  readXml,
  elements,
  childElements,
  relationships,
} from './archive';
import { OFFICE_LIMITS } from './model';
import { drawPptxText, pptxColor as color } from './pptx-text';
import { canvasPdfPage } from './pdf-office-layout';
import { officeBitmap } from './bitmap';
const relation = (node: Element, name: string) =>
  node.getAttributeNS(
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    name,
  ) ??
  node.getAttribute(`r:${name}`) ??
  '';
const number = (node: Element | undefined, name: string, fallback = 0) => {
  const value = Number(node?.getAttribute(name) ?? fallback);
  if (!Number.isFinite(value) || Math.abs(value) > 1e9)
    throw new Error('officeLimit');
  return value;
};
function box(shape: Element) {
  const transform = elements(shape, 'xfrm')[0],
    off = transform && elements(transform, 'off')[0],
    ext = transform && elements(transform, 'ext')[0];
  if (!transform || !off || !ext) throw new Error('officeUnsupported');
  const result = {
    x: number(off, 'x') / 12700,
    y: number(off, 'y') / 12700,
    w: number(ext, 'cx') / 12700,
    h: number(ext, 'cy') / 12700,
    rotation: number(transform, 'rot') / 60000,
    flipH: transform.getAttribute('flipH') === '1',
    flipV: transform.getAttribute('flipV') === '1',
  };
  if (result.w <= 0 || result.h <= 0) throw new Error('officeUnsupported');
  return result;
}
export async function pptxPdf(file: Blob, progress: (p: number) => void) {
  const archive = await openOffice(file, 'pptx'),
    presentation = readXml(archive, 'ppt/presentation.xml'),
    size = elements(presentation, 'sldSz')[0];
  const width = number(size, 'cx') / 12700,
    height = number(size, 'cy') / 12700;
  if (
    width < 1 ||
    height < 1 ||
    width * height * 4 > 12_000_000 ||
    width > 3000 ||
    height > 3000
  )
    throw new Error('officeLimit');
  const ids = elements(presentation, 'sldId'),
    rels = relationships(archive, 'ppt/presentation.xml');
  if (!ids.length || ids.length > OFFICE_LIMITS.pages)
    throw new Error('officeLimit');
  if (typeof OffscreenCanvas === 'undefined') throw new Error('browser');
  const pdf = await PDFDocument.create(),
    canvas = new OffscreenCanvas(Math.ceil(width * 2), Math.ceil(height * 2)),
    ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('browser');
  try {
    for (const [index, id] of ids.entries()) {
      const path = rels.get(relation(id, 'id'));
      if (!path) throw new Error('corrupt');
      const slide = readXml(archive, path),
        tree = elements(slide, 'spTree')[0],
        assets = relationships(archive, path);
      if (!tree) throw new Error('corrupt');
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.fillStyle = color(elements(slide, 'bg')[0], '#ffffff');
      ctx.fillRect(0, 0, width, height);
      for (const shape of childElements(tree)) {
        if (['nvGrpSpPr', 'grpSpPr'].includes(shape.localName ?? '')) continue;
        if (
          !['sp', 'pic', 'graphicFrame', 'cxnSp'].includes(
            shape.localName ?? '',
          )
        )
          throw new Error('officeUnsupported');
        const geometry = elements(shape, 'prstGeom')[0]?.getAttribute('prst');
        if (geometry && !['rect', 'roundRect'].includes(geometry))
          throw new Error('officeUnsupported');
        const b = box(shape);
        const tableGeometry = elements(shape, 'tbl')[0];
        if (tableGeometry) {
          // PowerPoint 以實際列高／欄寬更新表格外框；來源外框可能尚未同步。
          b.h = elements(tableGeometry, 'tr').reduce(
            (sum, row) => sum + number(row, 'h') / 12700,
            0,
          );
          b.w = elements(tableGeometry, 'gridCol').reduce(
            (sum, col) => sum + number(col, 'w') / 12700,
            0,
          );
          if (b.h <= 0 || b.w <= 0 || b.h > 3000 || b.w > 3000)
            throw new Error('officeLimit');
        }
        ctx.save();
        try {
          ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
          ctx.rotate((b.rotation * Math.PI) / 180);
          ctx.scale(b.flipH ? -1 : 1, b.flipV ? -1 : 1);
          ctx.translate(-b.w / 2, -b.h / 2);
          if (shape.localName === 'pic') {
            const blip = elements(shape, 'blip')[0],
              imagePath = blip && assets.get(relation(blip, 'embed'));
            if (!imagePath || !archive[imagePath])
              throw new Error('officeUnsupported');
            const image = await officeBitmap(archive[imagePath]);
            try {
              const crop = elements(shape, 'srcRect')[0],
                left = number(crop, 'l') / 100000,
                top = number(crop, 't') / 100000,
                right = number(crop, 'r') / 100000,
                bottom = number(crop, 'b') / 100000;
              if (
                [left, top, right, bottom].some((n) => n < 0) ||
                left + right >= 1 ||
                top + bottom >= 1
              )
                throw new Error('officeUnsupported');
              ctx.drawImage(
                image,
                image.width * left,
                image.height * top,
                image.width * (1 - left - right),
                image.height * (1 - top - bottom),
                0,
                0,
                b.w,
                b.h,
              );
            } finally {
              image.close();
            }
          } else if (shape.localName === 'graphicFrame') {
            const table = elements(shape, 'tbl')[0];
            if (!table) throw new Error('officeUnsupported');
            const rows = elements(table, 'tr');
            const grid = elements(table, 'gridCol').map(
              (col) => number(col, 'w') / 12700,
            );
            if (
              !rows.length ||
              rows.length > 100 ||
              !grid.length ||
              grid.length > 32
            )
              throw new Error('officeLimit');
            let rowY = 0;
            for (const row of rows) {
              const rowHeight = number(row, 'h') / 12700;
              if (rowHeight <= 0 || rowY + rowHeight > b.h + 1)
                throw new Error('officeUnsupported');
              const cells = elements(row, 'tc');
              if (cells.length !== grid.length)
                throw new Error('officeUnsupported');
              let cellX = 0;
              for (const [column, cell] of cells.entries()) {
                if (
                  Number(cell.getAttribute('gridSpan') ?? 1) > 1 ||
                  Number(cell.getAttribute('rowSpan') ?? 1) > 1 ||
                  ['1', 'true'].includes(cell.getAttribute('hMerge') ?? '') ||
                  ['1', 'true'].includes(cell.getAttribute('vMerge') ?? '')
                )
                  throw new Error('officeUnsupported');
                const cellWidth = grid[column];
                if (cellWidth <= 0 || cellX + cellWidth > b.w + 1)
                  throw new Error('officeUnsupported');
                ctx.save();
                try {
                  ctx.translate(cellX, rowY);
                  const fill = elements(cell, 'tcPr')[0];
                  ctx.fillStyle = color(fill, '#ffffff');
                  ctx.fillRect(0, 0, cellWidth, rowHeight);
                  ctx.strokeStyle = '#777777';
                  ctx.lineWidth = 0.5;
                  ctx.strokeRect(0, 0, cellWidth, rowHeight);
                  drawPptxText(ctx, cell, cellWidth, rowHeight);
                } finally {
                  ctx.restore();
                }
                cellX += cellWidth;
              }
              rowY += rowHeight;
            }
          } else {
            const properties = childElements(shape).find(
                (e) => e.localName === 'spPr',
              ),
              fill =
                properties &&
                childElements(properties).find(
                  (e) => e.localName === 'solidFill',
                );
            if (fill) {
              ctx.fillStyle = color(fill, '#eeeeee');
              ctx.fillRect(0, 0, b.w, b.h);
            }
            const line =
              properties &&
              childElements(properties).find((e) => e.localName === 'ln');
            if (line && elements(line, 'solidFill').length) {
              ctx.strokeStyle = color(line, '#555555');
              ctx.lineWidth = 1;
              ctx.strokeRect(0, 0, b.w, b.h);
            }
            drawPptxText(ctx, shape, b.w, b.h);
          }
        } finally {
          ctx.restore();
        }
      }
      await canvasPdfPage(pdf, canvas, width, height);
      progress(0.15 + ((index + 1) / ids.length) * 0.7);
    }
    return new Blob([new Uint8Array(await pdf.save())], {
      type: 'application/pdf',
    });
  } finally {
    canvas.width = canvas.height = 0;
  }
}
