import { ConverterRegistry } from '@/core/converter';
import { toMp4 } from './to-mp4';
import { toM4a } from './to-m4a';
import { toMp3 } from './to-mp3';
export const mediaRegistry = new ConverterRegistry();
for (const converter of [toMp4, toM4a, toMp3])
  mediaRegistry.register(converter);
