import type { Converter } from '@/core/converter';
import { runMedia } from './run';
import { mediaOptions } from './options';
export const toMp3: Converter = {
  id: 'media-to-mp3',
  from: ['video/mp4', 'audio/mp4', 'audio/mpeg'],
  to: 'audio/mpeg',
  tier: 1,
  run: (files, options, ctx) =>
    runMedia(files, { ...mediaOptions(options), format: 'mp3' }, ctx),
};
