import { inspectRaster } from '../../image/inspect';
export async function officeBitmap(bytes: Uint8Array, mime?: string) {
  try {
    const info = inspectRaster(bytes);
    if (info.width * info.height > 12_000_000) throw new Error('officeLimit');
    if (mime && info.mime !== mime) throw new Error('corrupt');
    return await createImageBitmap(
      new Blob([new Uint8Array(bytes)], { type: info.mime }),
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'officeLimit') throw error;
    throw new Error('officeUnsupported', { cause: error });
  }
}
