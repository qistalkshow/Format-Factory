import type { Converter } from '@/core/converter';
import { runMedia } from './run';
import { mediaOptions } from './options';
export const toM4a: Converter = {
  id: 'media-to-m4a',
  from: ['video/mp4', 'audio/mp4', 'audio/mpeg'],
  to: 'audio/mp4',
  tier: 1,
  run: (files, options, ctx) =>
    runMedia(files, { ...mediaOptions(options), format: 'm4a' }, ctx),
};
