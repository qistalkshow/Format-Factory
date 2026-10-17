import type { Converter } from '@/core/converter';
import { runPdf } from './run';
export const toPptx: Converter = {
  id: 'pdf-pptx',
  from: ['application/pdf'],
  to: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  tier: 1,
  run: runPdf('pptx'),
};
