import type { Element } from '@xmldom/xmldom';
import { childElements, elements } from './archive';
import { styledLines, drawStyledLine } from './inline-text';
import { OFFICE_LIMITS, type InlineText } from './model';

export function pptxColor(node: Element | undefined, fallback: string) {
  const value = node && elements(node, 'srgbClr')[0]?.getAttribute('val');
  return value && /^[\da-f]{6}$/i.test(value) ? `#${value}` : fallback;
}
function measure(node: Element | undefined, key: string, fallback: number) {
  const raw = node?.getAttribute(key);
  const result = raw ? Number(raw) : fallback;
  if (!Number.isFinite(result) || Math.abs(result) > 1e9)
    throw new Error('officeLimit');
  return result;
}
export function pptxRuns(paragraph: Element): InlineText[] {
  const fallback = elements(paragraph, 'defRPr')[0];
  return childElements(paragraph)
    .filter((run) => ['r', 'fld', 'br'].includes(run.localName ?? ''))
    .map((run) => {
      const properties = elements(run, 'rPr')[0];
      const attr = (key: string) =>
        properties?.getAttribute(key) ?? fallback?.getAttribute(key);
      const baseline = Number(attr('baseline') ?? 0);
      const size = Number(attr('sz') ?? 1800) / 100;
      if (!Number.isFinite(size) || size < 1 || size > 400)
        throw new Error('officeUnsupported');
      return {
        text:
          run.localName === 'br'
            ? '\n'
            : elements(run, 't')
                .map((t) => t.textContent ?? '')
                .join(''),
        size,
        bold: attr('b') === '1',
        italic: attr('i') === '1',
        underline: Boolean(attr('u') && attr('u') !== 'none'),
        script: baseline > 0 ? 'sup' : baseline < 0 ? 'sub' : undefined,
        color: pptxColor(properties, pptxColor(fallback, '#111111')),
      };
    });
}

export function drawPptxText(
  ctx: OffscreenCanvasRenderingContext2D,
  node: Element,
  width: number,
  height: number,
) {
  const body = elements(node, 'bodyPr')[0];
  const left = measure(body, 'lIns', 91440) / 12700,
    right = measure(body, 'rIns', 91440) / 12700;
  const top = measure(body, 'tIns', 45720) / 12700,
    bottom = measure(body, 'bIns', 45720) / 12700;
  const available = width - left - right;
  if (available <= 0 || height - top - bottom <= 0)
    throw new Error('officeUnsupported');
  let textLength = 0;
  const lines = elements(node, 'p').flatMap((paragraph) => {
    const runs = pptxRuns(paragraph);
    textLength += runs.reduce((total, run) => total + run.text.length, 0);
    if (textLength > OFFICE_LIMITS.text) throw new Error('officeLimit');
    const align = elements(paragraph, 'pPr')[0]?.getAttribute('algn');
    const defaultSize =
      measure(elements(paragraph, 'endParaRPr')[0], 'sz', 1800) / 100;
    return styledLines(ctx, runs, defaultSize, available).map((line) => {
      const size = line.length
        ? line.reduce(
            (largest, part) => Math.max(largest, part.run.size ?? defaultSize),
            0,
          )
        : defaultSize;
      return {
        line,
        size,
        height: size * 1.2,
        align,
        width: line.reduce((w, p) => w + p.width, 0),
      };
    });
  });
  const total = lines.reduce((sum, line) => sum + line.height, 0);
  if (total > height - top - bottom) throw new Error('officeUnsupported');
  const extra = height - top - bottom - total,
    anchor = body?.getAttribute('anchor');
  let y = top + (anchor === 'ctr' ? extra / 2 : anchor === 'b' ? extra : 0);
  for (const line of lines) {
    const x =
      left +
      (line.align === 'ctr'
        ? (available - line.width) / 2
        : line.align === 'r'
          ? available - line.width
          : 0);
    drawStyledLine(ctx, line.line, x, y, line.size);
    y += line.height;
  }
}
