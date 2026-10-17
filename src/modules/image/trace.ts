import type { Converter } from '@/core/converter';
import { execute } from './run';
export const trace: Converter = {
  id: 'image-trace',
  from: ['image/jpeg', 'image/png'],
  to: 'image/svg+xml',
  tier: 2,
  run: execute('trace'),
};
