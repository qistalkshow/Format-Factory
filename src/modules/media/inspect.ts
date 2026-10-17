export interface MediaInfo {
  duration: number;
  width: number;
  height: number;
  video: boolean;
  audio: boolean;
}
export async function mediaHeader(file: File): Promise<'mp4' | 'mp3'> {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (b.length >= 12 && String.fromCharCode(...b.slice(4, 8)) === 'ftyp')
    return 'mp4';
  if (
    b.length >= 3 &&
    (String.fromCharCode(...b.slice(0, 3)) === 'ID3' ||
      (b[0] === 255 && (b[1] & 0xe6) === 0xe2))
  )
    return 'mp3';
  throw new Error('unsupported');
}
export function parseMediaProbe(text: string): MediaInfo {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('corrupt');
  }
  if (!data || typeof data !== 'object') throw new Error('corrupt');
  const d = data as {
    error?: unknown;
    format?: { duration?: string };
    streams?: {
      codec_type?: string;
      width?: number;
      height?: number;
      channels?: number;
      disposition?: { attached_pic?: number };
    }[];
  };
  if (d.error || !Array.isArray(d.streams)) throw new Error('corrupt');
  const video = d.streams.find(
    (s) => s.codec_type === 'video' && !s.disposition?.attached_pic,
  );
  const audio = d.streams.find((s) => s.codec_type === 'audio');
  const duration = Number(d.format?.duration);
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 3600 ||
    (!video && !audio) ||
    (audio?.channels ?? 0) > 8
  )
    throw new Error('duration');
  const width = video?.width ?? 0,
    height = video?.height ?? 0;
  if (
    video &&
    (!Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width <= 0 ||
      height <= 0)
  )
    throw new Error('corrupt');
  return { duration, width, height, video: !!video, audio: !!audio };
}
