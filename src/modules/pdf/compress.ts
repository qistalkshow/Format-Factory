import type { Converter } from '@/core/converter';
import { runPdf } from './run';
export const compress: Converter = {
  id: 'pdf-compress',
  from: ['application/pdf'],
  to: 'application/pdf',
  tier: 1,
  run: runPdf('compress'),
};
