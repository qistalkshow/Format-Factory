import type { PdfOperation, PdfOptions } from './options';
export interface PdfRequest {
  action: PdfOperation | 'inspect' | 'thumbnails';
  files: Blob[];
  options: PdfOptions;
  start?: number;
}
export type PdfResponse =
  | { type: 'progress'; value: number }
  | { type: 'error'; code: string }
  | { type: 'result'; blobs: Blob[]; pages?: number };
export interface PdfResult {
  blobs: Blob[];
  pages?: number;
}
export function isPdfResponse(value: unknown): value is PdfResponse {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  if (value.type === 'progress')
    return (
      'value' in value &&
      typeof value.value === 'number' &&
      Number.isFinite(value.value) &&
      value.value >= 0 &&
      value.value <= 1
    );
  if (value.type === 'error')
    return 'code' in value && typeof value.code === 'string';
  return (
    value.type === 'result' &&
    'blobs' in value &&
    Array.isArray(value.blobs) &&
    value.blobs.every((b) => b instanceof Blob) &&
    (!('pages' in value) ||
      (typeof value.pages === 'number' &&
        Number.isInteger(value.pages) &&
        value.pages > 0))
  );
}
