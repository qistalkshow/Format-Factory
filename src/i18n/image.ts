import type { Locale } from './index';
const zh = {
  title: '圖片工作區',
  intro: '選擇每張圖片的動作，再開始本機處理。',
  empty: '請放入 JPG、PNG 或 SVG 圖片。',
  action: '處理動作',
  'image-to-png': '轉換為 PNG',
  'image-to-jpeg': '轉換為 JPG',
  'image-compress-jpeg': '壓縮 JPG',
  'image-compress-png': '壓縮 PNG',
  'image-trace': '近似向量化 SVG',
  tier1: 'Tier 1 · 圖片互轉／壓縮',
  tier2: 'Tier 2 · 近似向量化，非無損轉換',
  pngHint: 'JPG 轉 PNG 不會恢復已損失的細節，檔案可能變大。',
  traceHint:
    '大圖先縮小至最多 262,144 像素、最長邊 768 px；不適合追求照片原貌。透明區域先合成背景色。',
  svgHint: '只支援靜態、自包含 SVG。腳本、引用、濾鏡、內嵌圖片與動畫會被拒絕。',
  background: '透明區域背景色',
  width: '輸出寬度（0 表示原尺寸／倍率）',
  scale: 'SVG 縮放倍率',
  preset: '壓縮預設',
  low: '低壓縮',
  medium: '中壓縮',
  high: '高壓縮',
  custom: '自訂',
  quality: 'JPEG 品質',
  effort: 'PNG 最佳化努力程度（無損）',
  pngLossless:
    'Oxipng 無損壓縮 Canvas 產生的 8-bit sRGB 像素；滑桿調整運算量。高位元深度、色彩空間轉換與縮圖可能損失資訊。',
  metadata: '保留中繼資料',
  metadataHint:
    '預設移除 EXIF／GPS 等中繼資料。勾選保留可能包含位置與拍攝資訊；只保留支援的 EXIF、標準 XMP、IPTC、註解與 PNG 文字欄位。色彩轉為 sRGB，不保留原 ICC。',
  tracePreset: '描摹預設',
  mono: '黑白線稿',
  few: '少量色彩',
  many: '多色',
  detail: '細節程度',
  run: '開始處理',
  runAll: '處理全部待辦',
  cancel: '取消此檔',
  clear: '清除全部檔案與結果',
  idle: '準備就緒',
  queued: '排隊中',
  running: '正在處理',
  done: '處理完成',
  cancelled: '已取消，請重新選檔',
  failed: '處理失敗',
  download: '下載結果',
  before: '原圖',
  after: '結果',
  compare: '前後對比',
  compareHint: '拖曳滑桿或用左右方向鍵比較。',
  position: '對比位置',
  originalSize: '原始大小',
  resultSize: '結果大小',
  saved: '節省',
  larger: '結果比原檔大。你可以選擇保留原檔（包含原有中繼資料）。',
  keepOriginal: '使用原檔作為下載與 ZIP 結果',
  originalDownload: '下載原檔',
  zip: '打包已完成結果 ZIP',
  zipBusy: '正在打包',
  cancelZip: '取消打包',
  zipDownload: '下載 ZIP',
  limits:
    '上限：每批 20 檔／128 MiB、單檔 64 MiB、圖片 1,600 萬像素／單邊 8,192 px。結果總量上限 256 MiB。',
  engineJpeg:
    '首次壓縮 JPG 將載入本機託管 MozJPEG WASM，約 246 KiB；成功載入後可離線重用。',
  enginePng:
    '首次壓縮 PNG 將載入本機託管 Oxipng WASM，約 160 KiB；成功載入後可離線重用。',
  wasmOffline: '尚未快取的壓縮引擎需要先連線使用一次；一般互轉不需要 WASM。',
  errors: {
    corrupt: '圖片損毀或內容與格式不符。請重新匯出 JPG／PNG／SVG 後再試。',
    unsupported: '目前只支援 JPG、PNG 與 SVG。請選擇其他圖片。',
    animated: '目前不支援 GIF 或動畫 PNG，請先匯出單張靜態 PNG。',
    tooLarge: '圖片或批次超過安全上限。請先縮小尺寸或減少檔案數量。',
    invalidOptions: '設定超出有效範圍，請檢查尺寸與品質。',
    unsafeSvg:
      'SVG 含腳本、引用、動畫或不支援內容。請匯出為純靜態、自包含 SVG。',
    svgDimensions:
      'SVG 缺少可判斷的尺寸，請加入有效的 width／height 或 viewBox。',
    metadataInvalid:
      '中繼資料格式無法安全保留。請取消「保留中繼資料」後重新選檔。',
    browserUnsupported:
      '瀏覽器缺少所需的圖片或 Worker 功能，請改用新版瀏覽器。',
    timeout: '處理超過兩分鐘，已停止以釋放資源。請縮小圖片或降低描摹細節。',
    processingFailed:
      '圖片處理失敗，可能是記憶體不足或壓縮引擎尚未快取。請連線後重試，或改用較小圖片。',
  },
};
export type ImageMessages = typeof zh;
const en: ImageMessages = {
  title: 'Image workspace',
  intro: 'Choose an action for each image, then process locally.',
  empty: 'Add JPG, PNG or SVG images.',
  action: 'Action',
  'image-to-png': 'Convert to PNG',
  'image-to-jpeg': 'Convert to JPG',
  'image-compress-jpeg': 'Compress JPG',
  'image-compress-png': 'Compress PNG',
  'image-trace': 'Trace to SVG',
  tier1: 'Tier 1 · Convert / compress',
  tier2: 'Tier 2 · Approximate vectorization, not lossless',
  pngHint:
    'Converting JPG to PNG cannot restore lost detail and may increase file size.',
  traceHint:
    'Large images are reduced to at most 262,144 pixels and a 768 px longest edge. Not intended for photo fidelity. Transparency is flattened to the background color.',
  svgHint:
    'Static, self-contained SVG only. Scripts, references, filters, embedded images and animation are rejected.',
  background: 'Transparency background',
  width: 'Output width (0 uses original / scale)',
  scale: 'SVG scale',
  preset: 'Compression preset',
  low: 'Low compression',
  medium: 'Medium compression',
  high: 'High compression',
  custom: 'Custom',
  quality: 'JPEG quality',
  effort: 'PNG optimization effort (lossless)',
  pngLossless:
    'Oxipng losslessly compresses Canvas 8-bit sRGB pixels; the slider changes effort. High bit depth, color space conversion and resizing may lose information.',
  metadata: 'Keep metadata',
  metadataHint:
    'EXIF / GPS metadata is removed by default. Keeping it may retain location and camera data. Supported EXIF, standard XMP, IPTC, comments and PNG text fields only. Colors are converted to sRGB; original ICC profiles are not retained.',
  tracePreset: 'Tracing preset',
  mono: 'Black & white',
  few: 'Few colors',
  many: 'Many colors',
  detail: 'Detail',
  run: 'Process',
  runAll: 'Process all pending',
  cancel: 'Cancel file',
  clear: 'Clear all files and results',
  idle: 'Ready',
  queued: 'Queued',
  running: 'Processing',
  done: 'Complete',
  cancelled: 'Cancelled. Select files again.',
  failed: 'Failed',
  download: 'Download result',
  before: 'Original',
  after: 'Result',
  compare: 'Compare',
  compareHint: 'Drag the slider or use the arrow keys.',
  position: 'Comparison position',
  originalSize: 'Original size',
  resultSize: 'Result size',
  saved: 'Saved',
  larger:
    'The result is larger. You may keep the original, including its existing metadata.',
  keepOriginal: 'Use original for download and ZIP',
  originalDownload: 'Download original',
  zip: 'ZIP completed results',
  zipBusy: 'Creating ZIP',
  cancelZip: 'Cancel ZIP',
  zipDownload: 'Download ZIP',
  limits:
    'Limits: 20 files / 128 MiB per batch, 64 MiB per file, 16 million pixels / 8,192 px per side. Total results limited to 256 MiB.',
  engineJpeg:
    'First JPG compression loads self-hosted MozJPEG WASM (~246 KiB). Cached after successful loading for offline reuse.',
  enginePng:
    'First PNG compression loads self-hosted Oxipng WASM (~160 KiB). Cached after successful loading for offline reuse.',
  wasmOffline:
    'An uncached compression engine needs one online use first. Standard conversion requires no WASM.',
  errors: {
    corrupt:
      'Damaged image or mismatched contents. Re-export as JPG, PNG or SVG and try again.',
    unsupported: 'Only JPG, PNG and SVG are supported. Choose another image.',
    animated:
      'GIF and animated PNG are not supported. Export a single static PNG first.',
    tooLarge:
      'Image or batch exceeds the safety limit. Resize or select fewer files.',
    invalidOptions: 'Invalid settings. Check dimensions and quality.',
    unsafeSvg:
      'SVG includes scripts, references, animation or unsupported content. Export a static, self-contained SVG.',
    svgDimensions:
      'SVG dimensions are missing. Add valid width / height or viewBox.',
    metadataInvalid:
      'Metadata cannot be safely preserved. Uncheck “Keep metadata” and select the file again.',
    browserUnsupported:
      'Required image or Worker features are unavailable. Use a recent browser.',
    timeout:
      'Processing exceeded two minutes and was stopped. Reduce dimensions or tracing detail.',
    processingFailed:
      'Processing failed. Memory may be low or the engine may not be cached. Reconnect and retry, or use a smaller image.',
  },
};
export const imageMessages: Record<Locale, ImageMessages> = { 'zh-TW': zh, en };
export function errorMessage(t: ImageMessages, code?: string) {
  return code && code in t.errors
    ? t.errors[code as keyof typeof t.errors]
    : t.errors.processingFailed;
}
