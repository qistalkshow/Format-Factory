export const helpZh = {
  help: '使用說明',
  retry: '重新載入工具',
  reset: '清除工作並返回首頁',
  unexpected:
    '工具發生未預期錯誤。請清除工作後，改用較小的檔案重試。檔案不會上傳。',
  offlineUpdate: '有新版可用；請先下載結果，再關閉所有本站分頁並重新開啟。',
  stepsTitle: '三個步驟',
  steps: [
    '放入檔案：拖曳、點擊選檔或貼上。同批最多 20 檔、合計 128 MiB，使用相同模組。',
    '選擇動作：依格式顯示可用工具。先閱讀品質與限制，再開始處理；可取消進行中的工作。',
    '下載結果：檢查預覽與檔案大小，再下載或打包 ZIP。離開前請下載，工具不會保存工作。',
  ],
  qualityTitle: '支援格式與品質',
  quality:
    '圖片支援 JPG、PNG、SVG；PDF 支援合併、分割、影像式壓縮、PPTX 及 Office 匯出；影音支援 MP4、M4A、MP3。Tier 1 不代表無損壓縮。Tier 2 的圖片描摹、PDF ⇄ Office 是近似轉換，版面可能不同；Office → PDF 為圖片式頁面，文字不可搜尋。掃描 PDF 不做 OCR，舊版 DOC／XLS／PPT 不支援。',
  offlineTitle: '首次使用與離線準備',
  offline:
    '請由 HTTPS 網站或 localhost 開啟，不要雙擊 index.html。首頁顯示「基礎離線資源已就緒」只代表外殼及基礎圖片工具；圖片壓縮 WASM 要先線上使用一次。PDF／Office 請按「準備完整 PDF 離線資源」，影音選檔後請按「準備完整影音離線資源」。看到完成提示後才能斷線。清除網站資料或更新版本後，可能需要重新準備。授權文字按需載入，首次點閱需要連線。',
  troubleshootingTitle: '無法處理時',
  troubleshooting:
    '瀏覽器缺少 Worker Canvas、裝置記憶體不足或格式損毀時，會顯示原因。請更新瀏覽器、減少頁數／解析度，或從原應用程式重新匯出。複雜 Office 排版請使用原應用程式匯出 PDF。壓縮結果可能變大，可選原檔。新版提示出現時先下載結果，再關閉所有本站分頁重新開啟。',
  keyboardTitle: '鍵盤與無障礙',
  keyboard:
    '使用 Tab 移動焦點、Enter／空白鍵操作按鈕，方向鍵調整選單與滑桿。第一個連結可跳至主要內容。設定可切換語言與深淺主題，動效遵循系統的減少動態效果設定。',
  storageTitle: '檔案、偏好與離線快取',
  storage:
    '檔案、檔名、密碼與結果不會寫入 localStorage／IndexedDB 或伺服器紀錄。只有語言與主題偏好會保存；離線快取只儲存本站程式、引擎與靜態資源。切換至說明或設定不會清除工作；清除、換檔、換模組或離開時釋放。已下載的檔案由你自行管理。',
  networkTitle: '網路連線的範圍',
  network:
    '處理在本機 Worker 執行；首次載入程式與引擎只向本站取得靜態檔案，不傳送使用者文件。沒有 Cookie、廣告、分析、遠端字型或第三方轉檔服務。靜態託管商仍可能記錄一般網站連線資訊，例如 IP 位址與資源網址；本站不控制託管商的存取紀錄。',
  metadataTitle: '中繼資料與轉換限制',
  metadata:
    '圖片預設移除中繼資料；保留選項或下載原檔可能包含 GPS。PDF 合併／分割不保證清除所有敏感內容；影音重新編碼不保留來源標籤，但容器可能含編碼器標記。本工具不是文件去識別化或保密遮罩工具，分享前請自行檢查輸出。',
  licenses: '第三方授權全文',
};
export const helpEn: typeof helpZh = {
  help: 'Help',
  retry: 'Reload tools',
  reset: 'Clear work and return home',
  unexpected:
    'An unexpected tool error occurred. Clear this work and retry with a smaller file. Files are never uploaded.',
  offlineUpdate:
    'Update available. Download your results, then close all tabs for this site and reopen it.',
  stepsTitle: 'Three steps',
  steps: [
    'Add files: drop, choose or paste. Use one module per batch, up to 20 files totaling 128 MiB.',
    'Choose an action: available tools depend on the format. Read the quality limits before starting. Running work can be cancelled.',
    'Download: check the preview and file size, then download individually or as ZIP. Download before leaving; work is not saved.',
  ],
  qualityTitle: 'Formats and quality',
  quality:
    'Images: JPG, PNG and SVG. PDF: merge, split, image-based compression, PPTX and Office export. Media: MP4, M4A and MP3. Tier 1 does not mean lossless compression. Tier 2 tracing and PDF / Office conversion are approximate; layout may differ. Office → PDF produces page images with no searchable text. No OCR or legacy DOC / XLS / PPT support.',
  offlineTitle: 'First use and offline preparation',
  offline:
    'Open over HTTPS or localhost, not by double-clicking index.html. “Core offline assets ready” covers the shell and basic image tools only. Use image compression online once to cache its WASM. For PDF / Office, choose “Prepare full PDF offline assets”; for media, select files and choose “Prepare full media offline assets”. Wait for completion before disconnecting. Clearing site data or updating may require preparation again. License text loads on demand and needs a connection on first access.',
  troubleshootingTitle: 'When processing fails',
  troubleshooting:
    'Missing Worker Canvas, limited memory or damaged files produce an explanation. Update the browser, reduce pages / resolution, or export again from the original application. Use the original application for complex Office layouts. Compression can increase size; keep the original if needed. When an update is available, download results, close all site tabs and reopen.',
  keyboardTitle: 'Keyboard and accessibility',
  keyboard:
    'Use Tab to move focus, Enter / Space to activate buttons, and arrow keys for menus and sliders. The first link skips to main content. Settings offer language and theme controls; animation follows the system reduced-motion preference.',
  storageTitle: 'Files, preferences and caches',
  storage:
    'Files, filenames, passwords and results are not stored in localStorage / IndexedDB or server logs. Only language and theme preferences persist. Offline caches contain site code, engines and static assets only. Help and Settings retain your current work; clearing, replacing files, changing modules or leaving releases it. You manage downloaded files yourself.',
  networkTitle: 'Network connections',
  network:
    'Processing runs locally in Workers. Initial code and engine downloads fetch static assets from this site without sending your documents. No cookies, ads, analytics, remote fonts or third-party conversion service. The static hosting provider may log ordinary website access, such as IP addresses and resource URLs; this site does not control those access logs.',
  metadataTitle: 'Metadata and conversion limits',
  metadata:
    'Image metadata is removed by default. Keeping metadata or downloading originals may retain GPS. PDF merging / splitting does not guarantee removal of sensitive content. Media encoding drops source tags but may add encoder labels. This is not an anonymization or secure redaction tool; review outputs before sharing.',
  licenses: 'Third-party license text',
};
