import type { Converter } from '@/core/converter';
import { runPdf } from './run';
import { officeMimes } from './office/model';
export const fromXlsx: Converter = {
  id: 'pdf-from-xlsx',
  from: [officeMimes.xlsx],
  to: 'application/pdf',
  tier: 2,
  run: runPdf('from-xlsx'),
};
