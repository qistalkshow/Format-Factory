import type { WorkerRequest, WorkerResponse } from '@/core/worker-protocol';
import { processRaster } from '@/modules/image/process-raster';
import { parseOptions } from '@/modules/image/options';
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
};
scope.onmessage = async ({ data }) => {
  const progress = (value: number) =>
    scope.postMessage({ type: 'progress', value });
  try {
    let blob: Blob;
    if (data.type === 'zip') {
      const { zipSync } = await import('fflate');
      const files: Record<string, Uint8Array> = Object.create(null) as Record<
        string,
        Uint8Array
      >;
      for (const [i, file] of data.files.entries()) {
        files[file.name] = new Uint8Array(await file.blob.arrayBuffer());
        progress((i + 1) / (data.files.length + 1));
      }
      blob = new Blob([new Uint8Array(zipSync(files, { level: 0 }))], {
        type: 'application/zip',
      });
    } else
      blob = await processRaster(
        data.file,
        data.operation,
        parseOptions(data.options),
        progress,
      );
    scope.postMessage({ type: 'result', blob });
  } catch (error) {
    scope.postMessage({
      type: 'error',
      code: error instanceof Error ? error.message : 'processingFailed',
    });
  }
};
