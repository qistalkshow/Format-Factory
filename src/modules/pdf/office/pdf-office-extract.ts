import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { textLines, OFFICE_LIMITS, type TextLine } from './model';
interface PdfImage {
  width: number;
  height: number;
  data?: Uint8Array | Uint8ClampedArray;
  bitmap?: ImageBitmap;
  kind?: number;
}
export async function pageText(page: PDFPageProxy): Promise<TextLine[]> {
  const view = page.getViewport({ scale: 1 }),
    content = await page.getTextContent();
  let length = 0;
  return textLines(
    content.items.flatMap((item) => {
      if (!('str' in item)) return [];
      length += item.str.length;
      if (length > OFFICE_LIMITS.text) throw new Error('officeLimit');
      const [x, y] = view.convertToViewportPoint(
        item.transform[4],
        item.transform[5],
      );
      return [
        {
          text: item.str,
          x,
          y,
          width: item.width,
          size: Math.max(1, Math.hypot(item.transform[2], item.transform[3])),
          bold: /bold|black|demi/i.test(
            content.styles[item.fontName]?.fontFamily ?? '',
          ),
        },
      ];
    }),
  );
}
export async function pageImages(
  page: PDFPageProxy,
  ops: Record<string, number>,
): Promise<Uint8Array[]> {
  const list = await page.getOperatorList(),
    images: Uint8Array[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (let i = 0; i < list.fnArray.length; i++) {
    let image: PdfImage | undefined;
    if (
      list.fnArray[i] === ops.paintImageXObject ||
      list.fnArray[i] === ops.paintImageXObjectRepeat
    ) {
      const id: unknown = list.argsArray[i][0];
      if (typeof id !== 'string' || seen.has(id)) continue;
      seen.add(id);
      image = await new Promise<PdfImage>((resolve) =>
        page.objs.get(id, resolve),
      );
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
      images.push(bytes);
    } finally {
      canvas.width = canvas.height = 0;
    }
  }
  return images;
}
export function guardDocument(doc: PDFDocumentProxy) {
  if (doc.numPages > OFFICE_LIMITS.pages) throw new Error('officeLimit');
}
