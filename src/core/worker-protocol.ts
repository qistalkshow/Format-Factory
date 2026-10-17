import type { ImageOptions, Operation } from '@/modules/image/options';
export type ImageRequest = {
  type: 'image';
  file: Blob;
  operation: Operation;
  options: ImageOptions;
};
export type ZipRequest = { type: 'zip'; files: { name: string; blob: Blob }[] };
export type WorkerRequest = ImageRequest | ZipRequest;
export type WorkerResponse =
  | { type: 'progress'; value: number }
  | { type: 'result'; blob: Blob }
  | { type: 'error'; code: string };
export function isWorkerResponse(value: unknown): value is WorkerResponse {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  if (value.type === 'error')
    return 'code' in value && typeof value.code === 'string';
  if (value.type === 'progress')
    return (
      'value' in value &&
      typeof value.value === 'number' &&
      Number.isFinite(value.value) &&
      value.value >= 0 &&
      value.value <= 1
    );
  return (
    value.type === 'result' && 'blob' in value && value.blob instanceof Blob
  );
}
