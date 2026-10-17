import init, {
  optimise_raw,
} from '@jsquash/oxipng/codec/pkg/squoosh_oxipng.js';
import wasmUrl from '@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm?url';
export async function encodePng(
  data: ImageData,
  effort: number,
): Promise<Blob> {
  // 明確使用套件的單執行緒 codec，不需要 SharedArrayBuffer 或額外標頭。
  await init(wasmUrl);
  const bytes = optimise_raw(
    data.data,
    data.width,
    data.height,
    effort,
    false,
    false,
  );
  return new Blob([new Uint8Array(bytes)], { type: 'image/png' });
}
