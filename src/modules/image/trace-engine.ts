import tracer from 'imagetracerjs';
import type { ImageOptions } from './options';
export function traceImage(data: ImageData, options: ImageOptions): Blob {
  const tolerance = 3 - options.detail * 0.028;
  const svg = tracer.imagedataToSVG(data, {
    numberofcolors:
      options.tracePreset === 'mono'
        ? 2
        : options.tracePreset === 'few'
          ? 8
          : 24,
    ...(options.tracePreset === 'mono'
      ? {
          pal: [
            { r: 0, g: 0, b: 0, a: 255 },
            { r: 255, g: 255, b: 255, a: 255 },
          ],
        }
      : {}),
    ltres: tolerance,
    qtres: tolerance,
    pathomit: Math.round(20 - options.detail * 0.18),
    colorsampling: 2,
    colorquantcycles: 3,
    mincolorratio: 0,
    viewbox: true,
    desc: false,
    roundcoords: 2,
    strokewidth: 0,
  });
  return new Blob([svg], { type: 'image/svg+xml' });
}
