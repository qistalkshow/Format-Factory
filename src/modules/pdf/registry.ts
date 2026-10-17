import { fromPptx } from './from-pptx';
import { fromXlsx } from './from-xlsx';
import { fromDocx } from './from-docx';
import { toXlsx } from './to-xlsx';
import { toDocx } from './to-docx';
import { ConverterRegistry } from '@/core/converter';
import { merge } from './merge';
import { split } from './split';
import { compress } from './compress';
import { toPptx } from './to-pptx';
export const pdfRegistry = new ConverterRegistry();
for (const converter of [
  merge,
  split,
  compress,
  toPptx,
  fromPptx,
  fromXlsx,
  fromDocx,
  toXlsx,
  toDocx,
])
  pdfRegistry.register(converter);
