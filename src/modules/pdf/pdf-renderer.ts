import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { PDF_LIMITS, renderDimensions } from './options';
type CanvasPair = {
  canvas: OffscreenCanvas | null;
  context: OffscreenCanvasRenderingContext2D | null;
};
class WorkerCanvasFactory {
  create(width: number, height: number) {
    renderDimensions(width, height, 1);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('browser');
    return { canvas, context };
  }
  reset(pair: CanvasPair, width: number, height: number) {
    renderDimensions(width, height, 1);
    if (!pair.canvas) throw new Error('render');
    pair.canvas.width = width;
    pair.canvas.height = height;
  }
  destroy(pair: CanvasPair) {
    if (pair.canvas) pair.canvas.width = pair.canvas.height = 0;
    pair.canvas = null;
    pair.context = null;
  }
}
export async function openPdf(
  file: Blob,
  password: string,
): Promise<{ doc: PDFDocumentProxy; close(): Promise<void> }> {
  if (
    typeof DOMMatrix === 'undefined' ||
    typeof OffscreenCanvas === 'undefined' ||
    !new OffscreenCanvas(1, 1).getContext('2d')
  )
    throw new Error('browser');
  // display 在工作 Worker，parser 使用其子 Worker，避免 PDF.js 的訊息混入本站任務協定。
  const root = new URL(
    `${import.meta.env.BASE_URL}pdf-engine/`,
    self.location.origin,
  ).href;
  const library: typeof import('pdfjs-dist') = await import(
    /* @vite-ignore */ `${root}pdf.mjs`
  );
  const parser = new Worker(`${root}pdf.worker.mjs`, { type: 'module' });
  library.GlobalWorkerOptions.workerPort = parser;
  const task = library.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    password,
    verbosity: 0,
    CanvasFactory: WorkerCanvasFactory,
    disableFontFace: true,
    useSystemFonts: false,
    useWorkerFetch: true,
    cMapUrl: `${root}cmaps/`,
    standardFontDataUrl: `${root}standard_fonts/`,
    wasmUrl: `${root}wasm/`,
    iccUrl: `${root}iccs/`,
    enableXfa: false,
    stopAtErrors: true,
    canvasMaxAreaInBytes: PDF_LIMITS.pixels * 4,
    isImageDecoderSupported: false,
  });
  const close = async () => {
    try {
      await task.destroy();
    } finally {
      library.GlobalWorkerOptions.workerPort = null;
      parser.terminate();
    }
  };
  try {
    const doc = await task.promise;
    if (doc.numPages > PDF_LIMITS.pages || doc.numPages < 1)
      throw new Error('limit');
    return { doc, close };
  } catch (error) {
    await close();
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'PasswordException'
    )
      throw new Error(password ? 'passwordWrong' : 'password', {
        cause: error,
      });
    if (error instanceof Error && error.message === 'limit') throw error;
    throw new Error('corrupt', { cause: error });
  }
}
export async function renderPage(
  page: PDFPageProxy,
  scale: number,
  quality: number,
  type: 'image/png' | 'image/jpeg' = 'image/jpeg',
) {
  const original = page.getViewport({ scale: 1 });
  const size = renderDimensions(original.width, original.height, scale);
  const canvas = new OffscreenCanvas(size.width, size.height);
  try {
    // PDF.js 的型別只宣告 DOM canvas，但渲染器使用的 2D API 同樣適用 OffscreenCanvas。
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport: page.getViewport({ scale }),
      intent: 'print',
      annotationMode: 0,
      background: '#ffffff',
    }).promise;
    return {
      blob: await canvas.convertToBlob({ type, quality }),
      width: original.width,
      height: original.height,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'limit') throw error;
    throw new Error('render', { cause: error });
  } finally {
    canvas.width = canvas.height = 0;
    page.cleanup();
  }
}
