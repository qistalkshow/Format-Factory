import { detectFileType } from '@/core/file-type';
import type { PdfOperation } from './options';
import { officeMimes } from './office/model';
export const isOfficeOperation = (op: PdfOperation) =>
  ['docx', 'xlsx', 'from-docx', 'from-xlsx', 'from-pptx'].includes(op);
export function availablePdfOperations(files: File[]): PdfOperation[] {
  if (!files.length) return [];
  const mimes = files.map((f) => detectFileType(f).mime);
  if (mimes.some((m) => m !== mimes[0])) return [];
  if (mimes[0] === 'application/pdf')
    return files.length > 1
      ? ['merge']
      : ['merge', 'split', 'compress', 'pptx', 'docx', 'xlsx'];
  for (const kind of ['docx', 'xlsx', 'pptx'] as const)
    if (mimes[0] === officeMimes[kind]) return [`from-${kind}`];
  return [];
}
