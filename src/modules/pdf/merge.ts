import type { Converter } from '@/core/converter';
import { runPdf } from './run';
export const merge: Converter = {
  id: 'pdf-merge',
  from: ['application/pdf'],
  to: 'application/pdf',
  tier: 1,
  run: runPdf('merge'),
};
