import type { Converter } from '@/core/converter';
import { runPdf } from './run';
export const split: Converter = {
  id: 'pdf-split',
  from: ['application/pdf'],
  to: 'application/pdf',
  tier: 1,
  run: runPdf('split'),
};
