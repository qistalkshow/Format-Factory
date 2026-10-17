import { officeZh, officeEn, officeErrorsZh, officeErrorsEn } from './office';
import type { Locale } from './index';
const zh = {
  ...officeZh,
  title: 'PDF 工作區',
  empty:
    '請放入 PDF 或 Office 文件。PDF 匯出一次一份；Office 可同格式批次轉換。',
  limits:
    '單檔 64 MiB、每批 20 檔／128 MiB、最多 300 頁；單頁渲染最多 1,200 萬像素。',
  action: 'PDF 處理動作',
  merge: '合併 PDF',
  split: '分割 PDF',
  compress: '壓縮 PDF（頁面影像）',
  pptx: '轉為 PPTX（頁面圖片版）',
  tier: 'Tier 1 · 本機 PDF 基礎操作',
  structural:
    '合併／分割保留頁面內容，不保證保留書籤、表單互動與簽章；輸出不是安全清洗器。加密 PDF 無法直接合併／分割，請先用原應用程式匯出未加密副本。',
  raster:
    '這項操作會將每頁轉成圖片：失去可搜尋文字、向量、表單、連結、註解及原中繼資料；不做 OCR。壓縮結果不保證更小。',
  pptxHint:
    '每頁一張圖片投影片，文字不可編輯。投影片比例以第一頁為準，不同比例頁面置中留白。',
  acknowledge: '我了解頁面會轉成圖片並失去上述資訊',
  up: '往前移',
  down: '往後移',
  order: '檔案順序（可拖曳，或使用移動按鈕）',
  mode: '分割方式',
  range: '頁碼範圍（合成一份）',
  every: '每 N 頁一份',
  selected: '勾選縮圖（合成一份）',
  ranges: '頁碼，例如 1-3,5',
  interval: '每份頁數',
  password: 'PDF 密碼（只留在記憶體）',
  passwordHint: '密碼供縮圖、壓縮及 PDF 匯出使用。輸出不再加密，請妥善保管。',
  inspect: '讀取頁數',
  pages: '頁數',
  thumbnails: '載入這一組縮圖',
  prev: '上一組頁面',
  next: '下一組頁面',
  page: '頁',
  preset: '解析度／壓縮預設',
  low: '低壓縮 · 144 DPI / 88%',
  medium: '中壓縮 · 110 DPI / 72%',
  high: '高壓縮 · 72 DPI / 50%',
  run: '開始 PDF 處理',
  cancel: '取消 PDF 任務',
  clear: '清除 PDF 檔案與結果',
  idle: '準備就緒',
  queued: '排隊中',
  running: '正在處理',
  done: '處理完成',
  failed: '處理失敗',
  cancelled: '已取消',
  download: '下載 PDF 結果',
  pptxDownload: '下載 PPTX',
  zip: '打包所有結果 ZIP',
  zipDownload: '下載 PDF ZIP',
  before: '原始大小',
  after: '結果大小',
  saved: '節省',
  larger: '結果比原檔大，可選擇保留原檔。',
  keep: '使用原檔下載',
  original: '下載原始 PDF',
  engine: 'PDF 引擎按需載入，自本站下載，檔案不會上傳。首次使用需連線。',
  prepare: '準備完整 PDF 離線資源',
  preparing: '正在下載本站離線資源',
  ready: 'PDF 離線資源已就緒',
  engineSize: '完整離線資源原始大小',
  offlineHint: '先準備完整資源，再離線使用。清除瀏覽器快取後需重新準備。',
  errors: {
    ...officeErrorsZh,
    limit: 'PDF 超過安全上限，請減少檔案、頁數或選較低解析度。',
    range: '頁碼無效，請輸入有效範圍，或至少選取一頁。',
    options: '請檢查設定；除了合併，其餘動作一次只處理一份 PDF。',
    encrypted:
      '此 PDF 已加密，無法直接合併／分割。請先匯出未加密副本；或輸入密碼後改用頁面影像輸出。',
    password: '此 PDF 需要密碼。請輸入密碼後重試。',
    passwordWrong: '密碼不正確，請檢查後重試。',
    corrupt: '無法讀取文件，可能已損毀或格式不符。請從原應用程式重新匯出。',
    browser:
      '瀏覽器缺少 PDF 渲染所需的 Worker Canvas。請改用新版 Chrome／Edge；合併與範圍分割仍可使用。',
    render:
      '此頁包含目前無法正確渲染的內容，已停止輸出。請用原應用程式另存為較簡單的 PDF。',
    timeout: '處理超過三分鐘，已停止釋放資源。請縮小 PDF 或分批處理。',
    failed: 'PDF 處理失敗。請確認離線引擎已備妥，或連線重試並減少頁數。',
    offline: '離線資源未準備完成。請在正式預覽模式連線重新整理後重試。',
  },
};
export type PdfMessages = typeof zh;
const en: PdfMessages = {
  ...officeEn,
  title: 'PDF workspace',
  empty:
    'Add PDF or Office files. PDF export uses one file; Office conversion accepts batches of the same format.',
  limits:
    '64 MiB per file, 20 files / 128 MiB per batch, up to 300 pages; rendering limited to 12 million pixels per page.',
  action: 'PDF action',
  merge: 'Merge PDFs',
  split: 'Split PDF',
  compress: 'Compress PDF (page images)',
  pptx: 'Convert to PPTX (page images)',
  tier: 'Tier 1 · Local PDF operations',
  structural:
    'Merge / split preserve page content, but bookmarks, interactive forms and signatures may not survive. Output is not sanitized. Encrypted PDFs cannot be directly merged / split; export an unencrypted copy first.',
  raster:
    'Every page becomes an image: searchable text, vectors, forms, links, annotations and original metadata are lost. No OCR. Compression may increase size.',
  pptxHint:
    'One image per slide; text is not editable. Slides follow the first page aspect ratio; other ratios are centered with margins.',
  acknowledge:
    'I understand pages become images and the listed information is lost',
  up: 'Move earlier',
  down: 'Move later',
  order: 'File order (drag or use move buttons)',
  mode: 'Split mode',
  range: 'Page range (one output)',
  every: 'Every N pages',
  selected: 'Select thumbnails (one output)',
  ranges: 'Pages, e.g. 1-3,5',
  interval: 'Pages per output',
  password: 'PDF password (memory only)',
  passwordHint:
    'For thumbnails, compression and PDF export. Outputs are not encrypted; store them securely.',
  inspect: 'Read page count',
  pages: 'Pages',
  thumbnails: 'Load this group of thumbnails',
  prev: 'Previous pages',
  next: 'Next pages',
  page: 'Page',
  preset: 'Resolution / compression preset',
  low: 'Low · 144 DPI / 88%',
  medium: 'Medium · 110 DPI / 72%',
  high: 'High · 72 DPI / 50%',
  run: 'Process PDF',
  cancel: 'Cancel PDF task',
  clear: 'Clear PDF files and results',
  idle: 'Ready',
  queued: 'Queued',
  running: 'Processing',
  done: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
  download: 'Download PDF result',
  pptxDownload: 'Download PPTX',
  zip: 'ZIP all results',
  zipDownload: 'Download PDF ZIP',
  before: 'Original size',
  after: 'Result size',
  saved: 'Saved',
  larger: 'The result is larger. You can keep the original.',
  keep: 'Use original for download',
  original: 'Download original PDF',
  engine:
    'PDF engines load from this site on demand. Files are never uploaded. First use needs a connection.',
  prepare: 'Prepare complete PDF offline assets',
  preparing: 'Downloading this site’s offline assets',
  ready: 'PDF offline assets ready',
  engineSize: 'Complete offline assets, uncompressed',
  offlineHint:
    'Prepare assets before going offline. Prepare again after clearing browser caches.',
  errors: {
    ...officeErrorsEn,
    limit:
      'PDF exceeds safety limits. Reduce files or pages, or choose a lower resolution.',
    range: 'Invalid pages. Enter a valid range or select at least one page.',
    options: 'Check settings. Only merging accepts multiple PDFs.',
    encrypted:
      'Encrypted PDFs cannot be directly merged / split. Export an unencrypted copy, or enter a password and use page-image output.',
    password: 'This PDF needs a password. Enter it and retry.',
    passwordWrong: 'Incorrect password. Check it and retry.',
    corrupt:
      'Cannot read this document. It may be damaged or have mismatched contents. Export it again.',
    browser:
      'Worker Canvas for PDF rendering is unavailable. Use a recent Chrome / Edge. Merge and range splitting remain available.',
    render:
      'This page contains unsupported rendering content. Output was stopped. Re-export a simpler PDF.',
    timeout:
      'Stopped after three minutes to release resources. Reduce the PDF or process smaller batches.',
    failed:
      'PDF processing failed. Check offline assets, reconnect or reduce page count.',
    offline:
      'Offline assets are not ready. Reconnect and reload in production preview mode, then retry.',
  },
};
export const pdfMessages: Record<Locale, PdfMessages> = { 'zh-TW': zh, en };
export function pdfError(t: PdfMessages, error: string) {
  return error in t.errors
    ? t.errors[error as keyof typeof t.errors]
    : t.errors.failed;
}
