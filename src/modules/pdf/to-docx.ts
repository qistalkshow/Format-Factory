import type { Converter } from '@/core/converter';
import { runPdf } from './run';
import { officeMimes } from './office/model';
export const toDocx: Converter = {
  id: 'pdf-docx',
  from: ['application/pdf'],
  to: officeMimes.docx,
  tier: 2,
  run: runPdf('docx'),
};
