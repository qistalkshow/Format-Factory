import type { Converter } from '@/core/converter';
import { runWorker } from '@/core/worker-client';
import { detectFileType } from '@/core/file-type';
import { MAX_FILE_BYTES, parseOptions, type Operation } from './options';
import { rasterizeSvg } from './svg';
export function execute(operation: Operation): Converter['run'] {
  return async (input, options, ctx) => {
    const parsed = parseOptions(options);
    const results: Blob[] = [];
    for (const [index, file] of input.entries()) {
      ctx.signal.throwIfAborted();
      if (file.size > MAX_FILE_BYTES) throw new Error('tooLarge');
      const progress = (p: number) =>
        ctx.onProgress((index + p) / input.length);
      const mime = detectFileType(file).mime;
      if (mime === 'image/svg+xml') {
        if (operation !== 'to-png' && operation !== 'to-jpeg')
          throw new Error('unsupported');
        results.push(
          await rasterizeSvg(
            file,
            operation === 'to-png' ? 'image/png' : 'image/jpeg',
            parsed,
            ctx.signal,
            progress,
          ),
        );
      } else
        results.push(
          await runWorker(
            {
              type: 'image',
              file: new Blob([file], { type: mime }),
              operation,
              options: parsed,
            },
            ctx.signal,
            progress,
          ),
        );
    }
    return results;
  };
}
