import { isPdfResponse, type PdfRequest, type PdfResult } from './protocol';
export function pdfWorker(
  request: PdfRequest,
  signal: AbortSignal,
  onProgress: (p: number) => void,
): Promise<PdfResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException('Cancelled', 'AbortError'));
    if (typeof Worker === 'undefined') return reject(new Error('browser'));
    const worker = new Worker(
      new URL('../../workers/pdf-worker.ts', import.meta.url),
      { type: 'module' },
    );
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      worker.terminate();
    };
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const abort = () => fail(new DOMException('Cancelled', 'AbortError'));
    const timer = setTimeout(() => fail(new Error('timeout')), 180_000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => fail(new Error('failed'));
    worker.onmessageerror = () => fail(new Error('failed'));
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (!isPdfResponse(event.data)) return fail(new Error('failed'));
      const data = event.data;
      if (data.type === 'error') fail(new Error(data.code));
      else if (data.type === 'progress') onProgress(data.value);
      else {
        cleanup();
        resolve(data);
      }
    };
    try {
      worker.postMessage(request);
    } catch {
      fail(new Error('browser'));
    }
  });
}
