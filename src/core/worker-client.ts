import { isWorkerResponse, type WorkerRequest } from './worker-protocol';
export function runWorker(
  request: WorkerRequest,
  signal: AbortSignal,
  onProgress: (p: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Cancelled', 'AbortError'));
      return;
    }
    if (typeof Worker === 'undefined') {
      reject(new Error('browserUnsupported'));
      return;
    }
    const worker = new Worker(
      new URL('../workers/image.worker.ts', import.meta.url),
      { type: 'module' },
    );
    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      worker.terminate();
    };
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const abort = () => fail(new DOMException('Cancelled', 'AbortError'));
    const timeout = setTimeout(() => fail(new Error('timeout')), 120_000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => fail(new Error('processingFailed'));
    worker.onmessageerror = () => fail(new Error('processingFailed'));
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (!isWorkerResponse(event.data)) {
        fail(new Error('processingFailed'));
        return;
      }
      const message = event.data;
      if (message.type === 'progress') onProgress(message.value);
      else if (message.type === 'error') fail(new Error(message.code));
      else {
        cleanup();
        resolve(message.blob);
      }
    };
    // Blob 的 structured clone 共用不可變資料，避免複製大型 ArrayBuffer。
    try {
      worker.postMessage(request);
    } catch {
      fail(new Error('browserUnsupported'));
    }
  });
}
