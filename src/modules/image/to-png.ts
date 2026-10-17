import type { Converter } from '@/core/converter';
import { execute } from './run';
export const toPng: Converter = {
  id: 'image-to-png',
  from: ['image/jpeg', 'image/svg+xml'],
  to: 'image/png',
  tier: 1,
  run: execute('to-png'),
};
