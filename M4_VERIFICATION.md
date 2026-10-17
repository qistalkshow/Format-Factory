# M4 驗收紀錄

日期：2026-10-17。本階段為 PDF ⇄ Office（Tier 2），不包含 M5 或 Tier 3／OCR。

## 設計與變更

新增五個 Converter：PDF → DOCX／XLSX、DOCX／XLSX／PPTX → PDF。沿用 PDF 工作區、同一個序列 TaskQueue、進度與取消；解析及排版在 Worker 執行。Office 檔案由首頁自動導向 PDF 工作區，相同格式可批次輸出與 ZIP。

DOCX → PDF 透過 Mammoth 取得 HTML，再在 Worker 內解析有限內容與 A4 排版，沒有將 HTML 插入主頁或呼叫第三方。Office → PDF 為頁面圖片，文字不可搜尋／選取；此取捨保留可取消、可直接下載與中文系統字型顯示，但不等同原生 Office／瀏覽器列印保真度。UI 在開始前要求確認 Tier 2 限制。

PDF → DOCX 保留可編輯文字、以字級判定標題、簡單對齊表格與點陣圖片；圖片置於每頁文字後，向量圖形不保留。PDF → XLSX 每頁一個工作表，無表格時保留文字，不執行 OCR。完整支援矩陣見 README。

未更換框架、CSP、部署平台或既有引擎。Office chunk 和共享 ExcelJS／JSZip 都延後載入並列入 PDF 離線清單；沒有新增 WASM。原有 M3 GPL 發布檢查保留，應用來源 ZIP 會包含 M4 程式與 fixture。

## 安全性

- ZIP 項目、單項大小與展開總量限制；拒絕路徑跳脫、巨集、內嵌物件、DTD／實體宣告與外部圖片／資料。
- 檔案類型由 OOXML 主文件驗證；加密 Office、舊版格式提供提示。
- 不執行公式，缺少公式快取值時停止；不執行文件連結／HTML／腳本。
- 解析前檢查圖片檔頭與像素數；總文字、圖片、儲存格與輸出頁數限制。
- 除錯錯誤不回傳文件片段，正式 Worker 維持白名單錯誤代碼；關閉／取消會終止 Worker 並釋放結果 URL。
- npm audit：5 moderate、0 high／critical；CLI sprintf-js 與 UUID 相依通報的使用範圍及未修補狀態見第三方授權文件。不是零漏洞聲明。

## 驗證狀態

M4 專屬測試已通過 14 項，10 項能力／互斥案例跳過。Chromium、Firefox 驗證五種方向、離線、取消重跑與批次 ZIP；Windows WebKit／手機 WebKit 缺少 Worker Canvas，驗證友善錯誤提示。跳過不算功能通過，也不代表 Safari／iOS 真機已驗收。

`npm run lint`、`npm run typecheck`、`npm run test`（8 個測試檔、59 項測試）與 `npm run build` 通過。

完整 `npm run test:e2e`：72 項通過、36 項跳過、0 項失敗（Chromium、Firefox、Windows WebKit 與手機 WebKit 模擬）。包含 M0–M3 回歸與 M4 的同源網路監聽；沒有對外請求。Firefox 使用工作區內的官方瀏覽器副本，透過既有環境變數選擇，CI 預設設定不變。

另以本機 Edge 執行 M4：5 個適用案例皆回報成功（含離線）、1 個降級案例跳過，但 runner 在案例結束後未退出，手動中止。因此只記錄案例結果，不聲稱 Edge 整條指令通過；主要四組瀏覽器的完整指令正常退出。

視覺檢查自製 DOCX／XLSX／PPTX 的實際 PDF 頁面，中文、表格、數值與點陣圖片皆可見。三份單頁 PDF 分別為 41,118、31,473、45,042 B。390 px 手機版面無橫向溢出，可閱讀限制並操作確認欄位。

收尾修正：ExcelJS 對無文字頁面回傳 `columns: null`，原先會將掃描 PDF 的無內容錯誤掩蓋成一般失敗。現在跳過空欄位格式化，保留 `noOfficeContent` 的明確提示；E2E 同時覆蓋純文字逐頁工作表與掃描 PDF 拒絕輸出。

## 建置體積

以下為本機正式建置的 gzip 大小，單位 B；動態 chunk 不代表首次下載量。

| 項目                         |    gzip |
| ---------------------------- | ------: |
| 首屏 JS                      |  11,058 |
| 首屏 CSS                     |   1,716 |
| 首頁預快取總量（含授權文字） | 128,564 |
| PDF → DOCX chunk             | 128,226 |
| ExcelJS 共享 chunk           | 256,535 |
| DOCX → PDF chunk             |  67,464 |
| Office 排版與共用解析 chunk  |  39,083 |
| PPTX → PDF chunk             |   1,790 |
| XLSX → PDF chunk             |     684 |
| PDF → XLSX chunk             |     652 |

首屏 JS／CSS／預快取分別低於 80／15／150 KiB。沒有新增 WASM；相依用途、授權與 npm 封裝大小見 README 與 THIRD_PARTY_LICENSES.md。

## 已知限制

- 簡化輸出不保證原字型、欄寬、樣式、段落閱讀順序或精確版面。
- DOCX 圖表／SmartArt、合併儲存格表格、WMF／EMF 等圖片不支援。
- XLSX 不重算公式，不保留完整數字格式、隱藏工作表、圖表、繪圖與列印設定。
- PPTX 不重建完整佈景／母片、群組或複雜形狀；缺少位置、文字溢出與未知圖形會停止，不輸出偽造結果。
- 每批取消為取消整個 Office 批次；未新增每檔獨立取消介面。
- 檔案與展開大小防護不是瀏覽器硬記憶體隔離；大文件仍可能受裝置能力限制。
- Office 文件尚未使用桌面 Word／Excel／PowerPoint 人工開啟驗收；目前為真實格式解析、內容及像素檢查。

下一步建議為 M5 打磨與發布，等待使用者確認。
