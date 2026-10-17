import encode, { init } from '@jsquash/jpeg/encode.js';
import wasmUrl from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?url';
export async function encodeJpeg(
  data: ImageData,
  quality: number,
): Promise<Blob> {
  await init({ locateFile: () => wasmUrl });
  return new Blob([await encode(data, { quality })], { type: 'image/jpeg' });
}
