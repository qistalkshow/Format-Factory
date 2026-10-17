import { inspectRaster } from './inspect';
import {
  outputDimensions,
  flattenAlpha,
  type ImageOptions,
  type Operation,
} from './options';
import { preserveMetadata } from './metadata';
export async function processRaster(
  file: Blob,
  operation: Operation,
  options: ImageOptions,
  progress: (p: number) => void,
): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = inspectRaster(bytes);
  if (file.type && file.type !== info.mime) throw new Error('corrupt');
  progress(0.1);
  if (
    typeof OffscreenCanvas === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  )
    throw new Error('browserUnsupported');
  // 由瀏覽器套用全部 EXIF 方向（包含鏡像），輸出是已轉正的像素。
  const bitmap = await createImageBitmap(
    new Blob([bytes], { type: info.mime }),
    { imageOrientation: 'from-image' },
  );
  let canvas: OffscreenCanvas | undefined;
  try {
    const size = outputDimensions(
      bitmap.width,
      bitmap.height,
      options,
      operation === 'trace',
    );
    canvas = new OffscreenCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('browserUnsupported');
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    progress(0.35);
    const mime =
      operation === 'to-jpeg'
        ? 'image/jpeg'
        : operation === 'to-png'
          ? 'image/png'
          : info.mime;
    let blob: Blob;
    if (operation === 'compress' || operation === 'trace') {
      const data = ctx.getImageData(0, 0, size.width, size.height);
      if (mime === 'image/jpeg' || operation === 'trace')
        flattenAlpha(data.data, options.background);
      progress(0.45);
      if (operation === 'trace') {
        const { traceImage } = await import('./trace-engine');
        progress(0.55);
        blob = traceImage(data, options);
      } else if (mime === 'image/jpeg') {
        const { encodeJpeg } = await import('./codec-jpeg');
        progress(0.55);
        blob = await encodeJpeg(data, options.quality);
      } else {
        const { encodePng } = await import('./codec-png');
        progress(0.55);
        blob = await encodePng(data, options.effort);
      }
    } else {
      if (mime === 'image/jpeg') {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = options.background;
        ctx.fillRect(0, 0, size.width, size.height);
      }
      blob = await canvas.convertToBlob({
        type: mime,
        quality: options.quality / 100,
      });
      if (blob.type !== mime) throw new Error('browserUnsupported');
    }
    progress(0.9);
    if (operation === 'compress' && options.keepMetadata)
      blob = await preserveMetadata(
        bytes,
        blob,
        info.mime,
        size.width,
        size.height,
      );
    progress(1);
    return blob;
  } finally {
    bitmap.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
