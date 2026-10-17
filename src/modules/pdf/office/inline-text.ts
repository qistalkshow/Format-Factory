import type { Element, Node } from '@xmldom/xmldom';
import type { InlineText } from './model';

export function inlineText(element: Element): InlineText[] {
  const runs: InlineText[] = [];
  function visit(node: Node, style: Omit<InlineText, 'text'>, depth: number) {
    if (depth > 64) throw new Error('officeLimit');
    if (node.nodeType === 3) {
      runs.push({ ...style, text: node.nodeValue ?? '' });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = (node as Element).localName?.toLowerCase();
    if (['script', 'style', 'iframe', 'object'].includes(tag ?? ''))
      throw new Error('unsafeOffice');
    if (tag === 'br') runs.push({ ...style, text: '\n' });
    const next = { ...style };
    if (tag === 'strong' || tag === 'b') next.bold = true;
    if (tag === 'em' || tag === 'i') next.italic = true;
    if (tag === 'u') next.underline = true;
    if (tag === 'sup' || tag === 'sub') next.script = tag;
    for (const child of Array.from(node.childNodes))
      visit(child, next, depth + 1);
  }
  visit(element, {}, 0);
  return runs;
}

export function styledLines(
  ctx: OffscreenCanvasRenderingContext2D,
  runs: InlineText[],
  size: number,
  width: number,
  bold = false,
) {
  const lines: {
    run: InlineText;
    text: string;
    width: number;
    font: string;
    size: number;
  }[][] = [[]];
  let used = 0;
  for (const run of runs) {
    const baseSize = run.size ?? size;
    if (!Number.isFinite(baseSize) || baseSize < 1 || baseSize > 400)
      throw new Error('officeUnsupported');
    const fontSize = run.script ? baseSize * 0.7 : baseSize;
    const font = `${run.italic ? 'italic ' : ''}${run.bold || bold ? 'bold ' : ''}${fontSize}px sans-serif`;
    ctx.font = font;
    for (const char of run.text.replace(/\r\n?/g, '\n')) {
      const w = ctx.measureText(char).width;
      if (char === '\n' || (used > 0 && used + w > width)) {
        lines.push([]);
        used = 0;
      }
      if (char === '\n') continue;
      const line = lines[lines.length - 1],
        last = line.at(-1);
      if (last?.run === run) {
        last.text += char;
        last.width += w;
      } else line.push({ run, text: char, width: w, font, size: fontSize });
      used += w;
    }
  }
  return lines;
}

export function drawStyledLine(
  ctx: OffscreenCanvasRenderingContext2D,
  line: ReturnType<typeof styledLines>[number],
  x: number,
  y: number,
  size: number,
) {
  const color = ctx.fillStyle;
  ctx.textBaseline = 'alphabetic';
  for (const part of line) {
    ctx.font = part.font;
    ctx.fillStyle = part.run.color ?? color;
    const baseline =
      y +
      size +
      (part.run.script === 'sup'
        ? -size * 0.35
        : part.run.script === 'sub'
          ? size * 0.2
          : 0);
    ctx.fillText(part.text, x, baseline);
    if (part.run.underline)
      ctx.fillRect(
        x,
        baseline + part.size * 0.12,
        part.width,
        Math.max(0.6, part.size / 16),
      );
    x += part.width;
  }
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
}
