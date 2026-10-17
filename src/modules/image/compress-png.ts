import type { Converter } from '@/core/converter';
import { execute } from './run';
export const compressPng: Converter = {
  id: 'image-compress-png',
  from: ['image/png'],
  to: 'image/png',
  tier: 1,
  run: execute('compress'),
};
