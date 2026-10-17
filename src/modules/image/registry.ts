import { ConverterRegistry } from '@/core/converter';
import { toPng } from './to-png';
import { toJpeg } from './to-jpeg';
import { compressJpeg } from './compress-jpeg';
import { compressPng } from './compress-png';
import { trace } from './trace';
export const imageRegistry = new ConverterRegistry();
for (const converter of [toPng, toJpeg, compressJpeg, compressPng, trace])
  imageRegistry.register(converter);
