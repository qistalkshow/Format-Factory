import type { Converter } from '@/core/converter';
import { runPdf } from './run';
import { officeMimes } from './office/model';
export const fromDocx: Converter = {
  id: 'pdf-from-docx',
  from: [officeMimes.docx],
  to: 'application/pdf',
  tier: 2,
  run: runPdf('from-docx'),
};
