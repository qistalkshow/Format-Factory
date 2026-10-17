import type { Converter } from '@/core/converter';
import { runMedia } from './run';
import { mediaOptions } from './options';
export const toMp4: Converter = {
  id: 'media-to-mp4',
  from: ['video/mp4', 'audio/mp4', 'audio/mpeg'],
  to: 'video/mp4',
  tier: 1,
  run: (files, options, ctx) =>
    runMedia(files, { ...mediaOptions(options), format: 'mp4' }, ctx),
};
