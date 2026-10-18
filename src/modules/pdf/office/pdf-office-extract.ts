import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { textLines, OFFICE_LIMITS, type TextLine } from './model';
import { markUnderlines } from './pdf-underlines';
interface PdfImage {
  width: number;
  height: number;
  data?: Uint8Array | Uint8ClampedArray;
  bitmap?: ImageBitmap;
  kind?: number;
}
export async function pageText(
  page: PDFPageProxy,
  ops?: Record<string, number>,
): Promise<TextLine[]> {
  const view = page.getViewport({ scale: 1 }),
    content = await page.getTextContent();
  // Operator list 會解析字型；文字樣式中的 fontFamily 常只有通用替代字型。
  const list = await page.getOperatorList();
  let length = 0;
  const lines = textLines(
    content.items.flatMap((item) => {
      if (!('str' in item)) return [];
      length += item.str.length;
      if (length > OFFICE_LIMITS.text) throw new Error('officeLimit');
      const [x, y] = view.convertToViewportPoint(
        item.transform[4],
        item.transform[5],
      );
      const font: unknown = page.commonObjs.has(item.fontName)
        ? page.commonObjs.get(item.fontName)
        : undefined;
      const data =
        font && typeof font === 'object'
          ? (font as { name?: string; bold?: boolean; italic?: boolean })
          : undefined;
      const name =
        data?.name ?? content.styles[item.fontName]?.fontFamily ?? '';
      return [
        {
          text: item.str,
          x,
          y,
          width: item.width,
          size: Math.max(1, Math.hypot(item.transform[2], item.transform[3])),
          bold: data?.bold || /bold|black|demi/i.test(name),
          italic: data?.italic || /italic|oblique/i.test(name),
          font: name
            .replace(/^[A-Z]{6}\+/, '')
            .replace(/[-,](Bold|Italic|Oblique|Regular).*/i, ''),
        },
      ];
    }),
  );
  if (ops) markUnderlines(lines, list, ops, view);
  return lines;
}
export async function pageImages(
  page: PDFPageProxy,
  ops: Record<string, number>,
): Promise<
  { bytes: Uint8Array; x: number; y: number; width: number; height: number }[]
> {
  const list = await page.getOperatorList(),
    images: {
      bytes: Uint8Array;
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
  const view = page.getViewport({ scale: 1 });
  let matrix = new DOMMatrix();
  const stack: DOMMatrix[] = [];
  let total = 0;
  for (let i = 0; i < list.fnArray.length; i++) {
    const op = list.fnArray[i],
      args = list.argsArray[i];
    if (op === ops.save || op === ops.paintFormXObjectBegin)
      stack.push(DOMMatrix.fromMatrix(matrix));
    if (op === ops.restore || op === ops.paintFormXObjectEnd)
      matrix = stack.pop() ?? new DOMMatrix();
    if (op === ops.transform)
      matrix = matrix.multiply(new DOMMatrix(args as number[]));
    if (op === ops.paintFormXObjectBegin && args[0])
      matrix = matrix.multiply(new DOMMatrix(args[0] as number[]));
    const placements = [matrix];
    let image: PdfImage | undefined;
    if (
      list.fnArray[i] === ops.paintImageXObject ||
      list.fnArray[i] === ops.paintImageXObjectRepeat
    ) {
      const id: unknown = list.argsArray[i][0];
      if (typeof id !== 'string') continue;
      if (op === ops.paintImageXObjectRepeat) {
        placements.length = 0;
        const positions = args[3] as number[];
        if (positions.length > 200) throw new Error('officeLimit');
        for (let p = 0; p < positions.length; p += 2)
          placements.push(
            matrix.multiply(
              new DOMMatrix([
                args[1],
                0,
                0,
                args[2],
                positions[p],
                positions[p + 1],
              ]),
            ),
          );
      }
      // PDF.js 會把跨頁共用圖片放進 commonObjs，不能在單頁池無限等待。
      const pool = id.startsWith('g_') ? page.commonObjs : page.objs;
      image = await new Promise<PdfImage>((resolve) => pool.get(id, resolve));
    } else if (list.fnArray[i] === ops.paintInlineImageXObject)
      image = list.argsArray[i][0] as PdfImage;
    if (!image) continue;
    const { width, height } = image;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height > 12_000_000 ||
      images.length >= 100
    )
      throw new Error('officeLimit');
    const canvas = new OffscreenCanvas(width, height),
      ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('browser');
    try {
      if (image.bitmap) ctx.drawImage(image.bitmap, 0, 0);
      else if (image.data) {
        const rgba = new Uint8ClampedArray(width * height * 4),
          data = image.data;
        for (let p = 0; p < width * height; p++) {
          if (image.kind === 3)
            rgba.set(data.subarray(p * 4, p * 4 + 4), p * 4);
          else if (image.kind === 2) {
            rgba[p * 4] = data[p * 3];
            rgba[p * 4 + 1] = data[p * 3 + 1];
            rgba[p * 4 + 2] = data[p * 3 + 2];
            rgba[p * 4 + 3] = 255;
          } else {
            const stride = Math.ceil(width / 8),
              offset =
                Math.floor(p / width) * stride + Math.floor((p % width) / 8);
            const v = (data[offset] >> (7 - ((p % width) % 8))) & 1 ? 255 : 0;
            rgba.set([v, v, v, 255], p * 4);
          }
        }
        ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
      } else throw new Error('render');
      const bytes = new Uint8Array(
        await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer(),
      );
      total += bytes.length;
      if (total > 64 * 1024 ** 2) throw new Error('officeLimit');
      for (const placement of placements) {
        if (images.length >= 100) throw new Error('officeLimit');
        const corners = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ].map(([x, y]) => {
          const point = placement.transformPoint({ x, y });
          return view.convertToViewportPoint(point.x, point.y);
        });
        const xs = corners.map((p) => p[0]),
          ys = corners.map((p) => p[1]);
        if (
          ![...xs, ...ys].every(
            (v) => Number.isFinite(v) && Math.abs(v) <= 1584,
          )
        )
          throw new Error('officeUnsupported');
        if (
          Math.max(...xs) === Math.min(...xs) ||
          Math.max(...ys) === Math.min(...ys)
        )
          continue;
        images.push({
          bytes,
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        });
      }
    } finally {
      canvas.width = canvas.height = 0;
    }
  }
  return images;
}
export function guardDocument(doc: PDFDocumentProxy) {
  if (doc.numPages > OFFICE_LIMITS.pages) throw new Error('officeLimit');
}
