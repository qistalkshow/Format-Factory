import type { Converter } from '@/core/converter';
import { execute } from './run';
export const toJpeg: Converter = {
  id: 'image-to-jpeg',
  from: ['image/png', 'image/svg+xml'],
  to: 'image/jpeg',
  tier: 1,
  run: execute('to-jpeg'),
};
