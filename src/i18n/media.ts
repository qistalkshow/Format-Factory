import type { Locale } from './index';
const zh = {
  title: '影音工具',
  empty: '請放入 MP4、M4A 或 MP3 檔案。',
  tier: 'Tier 1 · 本機重新編碼',
  description:
    '相同格式可壓縮；MP4 可抽取音訊，音訊轉 MP4 使用黑底。重新編碼有損，預設移除中繼資料，只保留第一條影片與音訊，不保留字幕、章節或附件。',
  engineNotice:
    '首次開始或準備離線時，會下載本站單執行緒 FFmpeg 核心（約 31 MiB，gzip 約 10 MiB）。不需要 SharedArrayBuffer；影片處理可能較慢。',
  limits:
    '每批最多 20 檔／128 MiB，每檔最長 1 小時。記憶體預估超過 1.5 GiB 時拒絕；每項任務最多 10 分鐘。',
  format: '輸出格式',
  mp4: 'MP4 影片／影片壓縮',
  m4a: 'M4A 音訊／音訊壓縮',
  mp3: 'MP3 音訊／音訊壓縮',
  preset: '壓縮預設',
  low: '低壓縮',
  medium: '中壓縮',
  high: '高壓縮',
  advanced: '進階設定',
  crf: 'CRF（較大值壓縮更多）',
  height: '影片最大高度',
  videoKbps: '影片位元率 kbps（0 使用 CRF）',
  audioKbps: '音訊位元率 kbps',
  rateHint: '非 0 位元率會取代 CRF；實際大小依內容而定，影片不放大。',
  start: '開始影音處理',
  cancel: '取消',
  clear: '清除影音工作',
  prepare: '準備完整影音離線資源',
  prepared: '影音離線資源已就緒',
  idle: '等待開始',
  queued: '排隊中',
  running: '處理中',
  done: '處理完成',
  cancelled: '已取消',
  failed: '處理失敗',
  loading: '正在載入核心／檢查檔案',
  download: '下載影音結果',
  original: '下載原檔',
  larger: '結果比原檔大，可以保留原檔；原檔也會保留原有中繼資料。',
  savings: '節省',
  preview: '結果預覽',
  previewHint: '若瀏覽器無法播放此編碼，仍可下載到支援的播放器驗證。',
  zip: '打包 ZIP',
  downloadZip: '下載影音 ZIP',
  license: '影音核心授權與來源資訊',
  errors: {
    options: '設定不在可用範圍，請重新選擇預設。',
    memory: '檔案或畫面尺寸超過安全門檻，請先縮短影片或降低輸入解析度。',
    unsupported: '目前只接受有效的 MP4、M4A、MP3；請確認格式後重新匯出。',
    corrupt:
      '檔案無法讀取，可能損毀或使用不支援的編碼；請先用播放器確認或重新匯出。',
    duration:
      '無法取得有效時長，或超過 1 小時／聲道上限。請縮短檔案並重新匯出。',
    noAudio: '這個檔案沒有可抽取的音軌，請選 MP4 或換一個有音訊的檔案。',
    engine:
      '影音核心載入失敗或記憶體不足。請連線、關閉其他分頁後重試；離線前先準備完整資源。',
    convert:
      '無法完成編碼，可能是不支援的內容或記憶體不足。請換較小的檔案重試。',
    output:
      '輸出超過大小上限或不完整，已拒絕提供截斷結果。請縮短檔案或提高壓縮程度。',
    timeout: '處理超過 10 分鐘，已停止並釋放引擎。請縮短檔案或降低解析度。',
    offline:
      '離線資源未準備完成。請使用正式預覽的 localhost／HTTPS 網址，連線並等待基礎離線就緒後重試。',
  },
};
export type MediaMessages = typeof zh;
const en: MediaMessages = {
  title: 'Video & audio tools',
  empty: 'Add MP4, M4A or MP3 files.',
  tier: 'Tier 1 · Local re-encoding',
  description:
    'Use the same format to compress, extract audio from MP4, or create a black video from audio. Re-encoding is lossy. Metadata is removed; only the first video and audio streams are retained, without subtitles, chapters or attachments.',
  engineNotice:
    'Starting a job or preparing offline resources downloads this site’s single-thread FFmpeg core (about 31 MiB, 10 MiB gzip). SharedArrayBuffer is not required. Video processing can be slow.',
  limits:
    'Up to 20 files / 128 MiB per batch, 1 hour per file. Rejects estimated memory above 1.5 GiB; each job has a 10-minute timeout.',
  format: 'Output format',
  mp4: 'MP4 video / compression',
  m4a: 'M4A audio / compression',
  mp3: 'MP3 audio / compression',
  preset: 'Compression preset',
  low: 'Low compression',
  medium: 'Medium compression',
  high: 'High compression',
  advanced: 'Advanced settings',
  crf: 'CRF (higher compresses more)',
  height: 'Maximum video height',
  videoKbps: 'Video bitrate kbps (0 uses CRF)',
  audioKbps: 'Audio bitrate kbps',
  rateHint:
    'A nonzero bitrate replaces CRF. Actual size depends on content. Videos are not upscaled.',
  start: 'Start media processing',
  cancel: 'Cancel',
  clear: 'Clear media jobs',
  prepare: 'Prepare all media offline assets',
  prepared: 'Media offline assets ready',
  idle: 'Ready to start',
  queued: 'Queued',
  running: 'Processing',
  done: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
  loading: 'Loading engine / checking input',
  download: 'Download media result',
  original: 'Download original',
  larger:
    'The output is larger. You may keep the original, including its existing metadata.',
  savings: 'Saved',
  preview: 'Result preview',
  previewHint:
    'If your browser cannot play this codec, download it and verify in a compatible player.',
  zip: 'Create ZIP',
  downloadZip: 'Download media ZIP',
  license: 'Media engine license and source information',
  errors: {
    options: 'Invalid settings. Select a preset and retry.',
    memory:
      'File or frame dimensions exceed the safety limit. Shorten the video or reduce input resolution first.',
    unsupported:
      'Only valid MP4, M4A and MP3 files are supported. Check the format or export again.',
    corrupt:
      'The file is damaged or uses an unsupported codec. Check it in a player or export again.',
    duration:
      'Invalid duration, over 1 hour, or too many audio channels. Shorten and export again.',
    noAudio:
      'No audio track to extract. Choose MP4 or a file containing audio.',
    engine:
      'Engine loading failed or memory is insufficient. Reconnect, close other tabs and retry. Prepare all assets before going offline.',
    convert:
      'Encoding failed due to unsupported content or insufficient memory. Try a smaller file.',
    output:
      'Output exceeds the size limit or is incomplete. Truncated output was rejected. Shorten the input or increase compression.',
    timeout:
      'The 10-minute limit was reached. The engine was stopped. Shorten the input or reduce resolution.',
    offline:
      'Offline assets are not ready. Use localhost / HTTPS production preview, reconnect and wait for core offline readiness before retrying.',
  },
};
export const mediaMessages: Record<Locale, MediaMessages> = { 'zh-TW': zh, en };
export function mediaError(code: string, t: MediaMessages) {
  return t.errors[code as keyof typeof t.errors] ?? t.errors.convert;
}
