export type MediaFormat = 'mp4' | 'm4a' | 'mp3';
export type MediaPreset = 'low' | 'medium' | 'high';
export interface MediaOptions {
  format: MediaFormat;
  crf: number;
  height: number;
  videoKbps: number;
  audioKbps: number;
}
export const mediaPresets = {
  low: { crf: 23, height: 1080, videoKbps: 0, audioKbps: 192 },
  medium: { crf: 28, height: 720, videoKbps: 0, audioKbps: 128 },
  high: { crf: 34, height: 480, videoKbps: 0, audioKbps: 64 },
};
export const mediaDefaults: MediaOptions = {
  format: 'mp4',
  ...mediaPresets.medium,
};
export const mediaMimes = {
  mp4: 'video/mp4',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
};
export const MAX_MEDIA_INPUT = 128 * 1024 ** 2;
export const MAX_MEDIA_OUTPUT = 256 * 1024 ** 2;
export const MEDIA_MEMORY_LIMIT = 1.5 * 1024 ** 3;
export const MEDIA_TIMEOUT = 10 * 60 * 1000;
export function mediaOptions(value: unknown): MediaOptions {
  if (!value || typeof value !== 'object') throw new Error('options');
  const o = value as MediaOptions;
  if (
    !['mp4', 'm4a', 'mp3'].includes(o.format) ||
    !Number.isInteger(o.crf) ||
    o.crf < 18 ||
    o.crf > 40 ||
    ![480, 720, 1080].includes(o.height) ||
    !Number.isInteger(o.videoKbps) ||
    o.videoKbps < 0 ||
    o.videoKbps > 20000 ||
    (o.videoKbps > 0 && o.videoKbps < 100) ||
    ![64, 96, 128, 192, 256, 320].includes(o.audioKbps)
  )
    throw new Error('options');
  return { ...o };
}
// 包含輸入副本、輸出副本、解碼／編碼影格與核心預留；不是瀏覽器實際用量保證。
export function estimateMediaMemory(bytes: number, width = 0, height = 0) {
  return (
    256 * 1024 ** 2 + bytes * 3 + MAX_MEDIA_OUTPUT * 3 + width * height * 64
  );
}
export function guardMediaMemory(bytes: number, width = 0, height = 0) {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0 ||
    bytes > MAX_MEDIA_INPUT ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 0 ||
    height < 0 ||
    width > 4096 ||
    height > 4096 ||
    width * height > 3840 * 2160 ||
    estimateMediaMemory(bytes, width, height) > MEDIA_MEMORY_LIMIT
  )
    throw new Error('memory');
}
