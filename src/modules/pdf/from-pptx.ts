import type { Converter } from '@/core/converter';
import { runPdf } from './run';
import { officeMimes } from './office/model';
export const fromPptx: Converter = {
  id: 'pdf-from-pptx',
  from: [officeMimes.pptx],
  to: 'application/pdf',
  tier: 2,
  run: runPdf('from-pptx'),
};
