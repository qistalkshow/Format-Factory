import PptxGenJS from 'pptxgenjs';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPage } from './pdf-renderer';
import { PDF_LIMITS, pdfPreset, type PdfOptions } from './options';
export async function makePptx(
  doc: PDFDocumentProxy,
  options: PdfOptions,
  progress: (p: number) => void,
): Promise<Blob> {
  const deck = new PptxGenJS();
  const first = await doc.getPage(1);
  const view = first.getViewport({ scale: 1 });
  const width = 10,
    height = (10 * view.height) / view.width;
  if (!Number.isFinite(height) || height < 1 || height > 56)
    throw new Error('limit');
  deck.defineLayout({ name: 'PDF', width, height });
  deck.layout = 'PDF';
  deck.author = '';
  deck.subject = '';
  deck.title = 'PDF pages';
  deck.company = '';
  const preset = pdfPreset(options.preset);
  let total = 0;
  for (let index = 1; index <= doc.numPages; index++) {
    const image = await renderPage(
      await doc.getPage(index),
      preset.dpi / 72,
      preset.quality,
    );
    total += image.blob.size;
    if (total > PDF_LIMITS.output) throw new Error('limit');
    const bytes = new Uint8Array(await image.blob.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 32768)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    const ratio = Math.min(width / image.width, height / image.height);
    const w = image.width * ratio,
      h = image.height * ratio;
    const slide = deck.addSlide();
    slide.background = { color: 'FFFFFF' };
    slide.addImage({
      data: `image/jpeg;base64,${btoa(binary)}`,
      x: (width - w) / 2,
      y: (height - h) / 2,
      w,
      h,
    });
    progress(0.15 + (index / doc.numPages) * 0.7);
  }
  const result = await deck.write({ outputType: 'blob', compression: true });
  if (!(result instanceof Blob)) throw new Error('failed');
  return new Blob([result], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}
