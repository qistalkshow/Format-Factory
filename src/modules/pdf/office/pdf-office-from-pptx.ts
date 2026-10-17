import { PDFDocument } from 'pdf-lib';
import type { Element } from '@xmldom/xmldom';
import {
  openOffice,
  readXml,
  elements,
  childElements,
  relationships,
} from './archive';
import { OFFICE_LIMITS, type InlineText } from './model';
import { styledLines, drawStyledLine } from './inline-text';
import { canvasPdfPage, wrapText } from './pdf-office-layout';
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
function color(node: Element | undefined, fallback: string) {
  const value = node && elements(node, 'srgbClr')[0]?.getAttribute('val');
  return value && /^[\da-f]{6}$/i.test(value) ? `#${value}` : fallback;
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
            const rows = elements(table, 'tr').map((row) =>
                elements(row, 'tc').map((cell) =>
                  elements(cell, 't')
                    .map((t) => t.textContent ?? '')
                    .join(' '),
                ),
              ),
              columns = Math.max(...rows.map((r) => r.length));
            if (!rows.length || columns > 32 || rows.length > 100)
              throw new Error('officeLimit');
            ctx.font = '12px sans-serif';
            ctx.textBaseline = 'top';
            ctx.strokeStyle = '#555555';
            ctx.fillStyle = '#111111';
            rows.forEach((row, r) =>
              row.forEach((text, c) => {
                const cw = b.w / columns,
                  rh = b.h / rows.length;
                ctx.strokeRect(c * cw, r * rh, cw, rh);
                const lines = wrapText(ctx, text, cw - 8);
                if (lines.length * 16 > rh - 8)
                  throw new Error('officeUnsupported');
                lines.forEach((line, k) =>
                  ctx.fillText(line, c * cw + 4, r * rh + 4 + k * 16),
                );
              }),
            );
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
            if (line && !elements(line, 'noFill').length) {
              ctx.strokeStyle = color(line, '#555555');
              ctx.lineWidth = 1;
              ctx.strokeRect(0, 0, b.w, b.h);
            }
            let y = 4;
            for (const paragraph of elements(shape, 'p')) {
              const text = elements(paragraph, 't')
                .map((t) => t.textContent ?? '')
                .join('');
              if (!text) continue;
              const style =
                  elements(paragraph, 'rPr')[0] ??
                  elements(paragraph, 'defRPr')[0],
                fontSize = Math.max(
                  8,
                  Math.min(96, number(style, 'sz', 1800) / 100),
                );
              ctx.font = `${style?.getAttribute('b') === '1' ? 'bold ' : ''}${fontSize}px sans-serif`;
              ctx.fillStyle = color(style, '#111111');
              ctx.textBaseline = 'top';
              const fallback = elements(paragraph, 'defRPr')[0];
              const runs: InlineText[] = childElements(paragraph)
                .filter((run) =>
                  ['r', 'fld', 'br'].includes(run.localName ?? ''),
                )
                .map((run) => {
                  const properties = elements(run, 'rPr')[0];
                  const attr = (name: string) =>
                    properties?.getAttribute(name) ??
                    fallback?.getAttribute(name);
                  const baseline = Number(attr('baseline') ?? 0);
                  return {
                    text:
                      run.localName === 'br'
                        ? '\n'
                        : elements(run, 't')
                            .map((t) => t.textContent ?? '')
                            .join(''),
                    bold: attr('b') === '1',
                    italic: attr('i') === '1',
                    underline: Boolean(attr('u') && attr('u') !== 'none'),
                    script:
                      baseline > 0 ? 'sup' : baseline < 0 ? 'sub' : undefined,
                    color: color(properties, color(fallback, '#111111')),
                  };
                });
              for (const line of styledLines(
                ctx,
                runs.length ? runs : [{ text }],
                fontSize,
                Math.max(1, b.w - 8),
              )) {
                if (y + fontSize > b.h) throw new Error('officeUnsupported');
                drawStyledLine(ctx, line, 4, y, fontSize);
                y += fontSize * 1.2;
              }
            }
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
