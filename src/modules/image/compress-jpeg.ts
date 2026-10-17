import type { Converter } from '@/core/converter';
import { execute } from './run';
export const compressJpeg: Converter = {
  id: 'image-compress-jpeg',
  from: ['image/jpeg'],
  to: 'image/jpeg',
  tier: 1,
  run: execute('compress'),
};
