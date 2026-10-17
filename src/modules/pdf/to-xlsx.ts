import type { Converter } from '@/core/converter';
import { runPdf } from './run';
import { officeMimes } from './office/model';
export const toXlsx: Converter = {
  id: 'pdf-xlsx',
  from: ['application/pdf'],
  to: officeMimes.xlsx,
  tier: 2,
  run: runPdf('xlsx'),
};
