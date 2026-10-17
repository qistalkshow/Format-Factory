export const MAX_PIXELS = 16_000_000;
export const MAX_SIDE = 8192;
export const MAX_FILE_BYTES = 64 * 1024 ** 2;
export const TRACE_PIXELS = 512 * 512;
export const TRACE_SIDE = 768;
export type Operation = 'to-png' | 'to-jpeg' | 'compress' | 'trace';
export type TracePreset = 'mono' | 'few' | 'many';
export interface ImageOptions {
  background: string;
  quality: number;
  effort: number;
  width: number;
  scale: number;
  keepMetadata: boolean;
  tracePreset: TracePreset;
  detail: number;
}
export const defaults: ImageOptions = {
  background: '#ffffff',
  quality: 75,
  effort: 2,
  width: 0,
  scale: 1,
  keepMetadata: false,
  tracePreset: 'few',
  detail: 50,
};
export function compressionPreset(preset: 'low' | 'medium' | 'high') {
  return {
    low: { quality: 90, effort: 1 },
    medium: { quality: 75, effort: 2 },
    high: { quality: 50, effort: 4 },
  }[preset];
}
export function parseOptions(value: unknown): ImageOptions {
  if (!value || typeof value !== 'object') throw new Error('invalidOptions');
  const o = { ...defaults, ...value };
  if (
    !/^#[0-9a-f]{6}$/i.test(o.background) ||
    !Number.isFinite(o.quality) ||
    o.quality < 1 ||
    o.quality > 100 ||
    !Number.isInteger(o.effort) ||
    o.effort < 0 ||
    o.effort > 6 ||
    !Number.isInteger(o.width) ||
    o.width < 0 ||
    o.width > MAX_SIDE ||
    ![1, 2, 4].includes(o.scale) ||
    typeof o.keepMetadata !== 'boolean' ||
    !['mono', 'few', 'many'].includes(o.tracePreset) ||
    !Number.isFinite(o.detail) ||
    o.detail < 0 ||
    o.detail > 100
  )
    throw new Error('invalidOptions');
  return o;
}
export function checkDimensions(width: number, height: number): void {
  if (![width, height].every((n) => Number.isFinite(n) && n > 0))
    throw new Error('corrupt');
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS)
    throw new Error('tooLarge');
}
export function outputDimensions(
  width: number,
  height: number,
  options: ImageOptions,
  trace = false,
) {
  checkDimensions(width, height);
  let scale = options.width ? options.width / width : options.scale;
  if (trace)
    scale = Math.min(
      scale,
      1,
      TRACE_SIDE / width,
      TRACE_SIDE / height,
      Math.sqrt(TRACE_PIXELS / (width * height)),
    );
  const result = {
    width: Math.max(
      1,
      trace ? Math.floor(width * scale) : Math.round(width * scale),
    ),
    height: Math.max(
      1,
      trace ? Math.floor(height * scale) : Math.round(height * scale),
    ),
  };
  checkDimensions(result.width, result.height);
  return result;
}
export function compositePixel(
  r: number,
  g: number,
  b: number,
  a: number,
  background: string,
) {
  const rgb = [1, 3, 5].map((offset) =>
    parseInt(background.slice(offset, offset + 2), 16),
  );
  return [r, g, b].map((channel, i) =>
    Math.round((channel * a) / 255 + rgb[i] * (1 - a / 255)),
  );
}
export function flattenAlpha(
  data: Uint8ClampedArray,
  background: string,
): void {
  const rgb = [1, 3, 5].map((offset) =>
    parseInt(background.slice(offset, offset + 2), 16),
  );
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    for (let c = 0; c < 3; c++)
      data[i + c] = Math.round(data[i + c] * alpha + rgb[c] * (1 - alpha));
    data[i + 3] = 255;
  }
}
