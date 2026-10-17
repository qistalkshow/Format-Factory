# AGENTS.md — 檔案格式處理工廠（FormatFactory）

> 本文件是給 Codex（及任何 AI 程式代理）的專案指令。開始任何工作前請完整閱讀，並在整個開發過程中遵守。若需求與本文件衝突，以「隱私」與「零成本」兩項原則為最高優先。

---

## 1. 專案目標

打造一個**純前端、離線可用、零成本**的檔案格式處理工具（PWA）。所有檔案處理都在使用者裝置的瀏覽器內完成，**檔案絕不上傳到任何伺服器**。

### 四大核心原則（依優先順序）

1. **隱私至上**：不上傳、不追蹤、不蒐集。
2. **完全 0 成本**：不使用任何付費服務、付費 API、需要後端主機的架構。
3. **輕量化**：首屏載入小、重型引擎按需載入、記憶體使用可控。
4. **科技感且簡單的介面**：一個畫面完成一件事，不需教學。

---

## 2. 功能需求

### 2.1 PDF 模組
| 功能 | 說明 |
|---|---|
| PDF → Word (.docx) | 抽取文字與版面（段落、標題、圖片、簡單表格） |
| PDF → Excel (.xlsx) | 偵測表格並輸出；無表格時以每頁一個工作表輸出文字 |
| PDF → PowerPoint (.pptx) | 每頁一張投影片（頁面圖片為底，可選疊加可編輯文字） |
| Word / Excel / PowerPoint → PDF | 反向轉換（見 §4 分級策略） |
| PDF 壓縮 | 提供 低 / 中 / 高 三檔，顯示壓縮前後大小 |
| PDF 合併 | 多檔拖曳排序後合併 |
| PDF 分割 | 依頁碼範圍、每 N 頁、或勾選頁面縮圖來分割 |

### 2.2 影音模組
| 功能 | 說明 |
|---|---|
| mp4 ⇄ m4a ⇄ mp3 互轉 | mp4 抽音訊、音訊轉 mp4（黑底或封面圖）、m4a ⇄ mp3 |
| 影片壓縮 | 調整 CRF / 解析度 / 位元率，提供三檔預設 |
| 音訊壓縮 | 調整位元率 |

### 2.3 圖片模組
| 功能 | 說明 |
|---|---|
| jpg ⇄ png | 位圖互轉（png 轉 jpg 時可選背景色） |
| svg → png / jpg | 光柵化，可指定輸出尺寸 / DPI |
| png / jpg → svg | **向量描摹（tracing）**，非無損；UI 需明確標示「近似向量化」 |
| 圖片壓縮 | jpg / png 可調品質，顯示前後大小與預覽對比 |

---

## 3. 技術選型（必須遵守）

### 3.1 架構
- **純靜態網站 + PWA**：沒有後端、沒有資料庫、沒有帳號系統。
- 部署目標：GitHub Pages 或 Cloudflare Pages 免費方案（兩者擇一，須有 GitHub Actions 自動部署）。
- 所有繁重運算放在 **Web Worker**，主執行緒只負責 UI。
- 使用 Service Worker 快取，第一次載入後可完全離線使用。

### 3.2 前端
- 語言：**TypeScript（strict 模式）**。
- 建置：**Vite**。
- UI 框架：優先 **Preact** 或 **Svelte**（擇一）；不得使用 React 完整版、Angular 等大型框架。
- 樣式：原生 CSS（CSS 變數 + 少量 utility）；**不引入 UI 元件庫、不引入 Tailwind 以外的大型 CSS 框架**（Tailwind 可選，但須確保產出 CSS < 30 KB）。
- 圖示：內嵌 SVG，不使用 icon font。
- 字型：系統字型堆疊，不載入外部字型。

### 3.3 處理引擎（優先使用下列，替換前需在 PR 說明理由與授權檢查）

| 用途 | 建議函式庫 | 備註 |
|---|---|---|
| PDF 合併/分割/頁面操作 | `pdf-lib` | MIT，純 JS |
| PDF 渲染、文字抽取 | `pdfjs-dist` | Apache-2.0，Worker 中執行 |
| DOCX 產生 | `docx` | MIT |
| XLSX 讀寫 | `exceljs` 或 `SheetJS` 社群版 | 擇一，注意體積 |
| PPTX 產生 | `pptxgenjs` | MIT |
| DOCX → HTML（供轉 PDF） | `mammoth` | BSD |
| 影音轉檔 | `@ffmpeg/ffmpeg` + `@ffmpeg/core`（ffmpeg.wasm） | 見 §3.5 |
| 圖片壓縮/編碼 | `@jsquash/*`（mozjpeg、oxipng、webp 的 WASM） 或 Canvas API | 依體積決定 |
| PNG/JPG → SVG 描摹 | `imagetracerjs` | Unlicense |
| SVG 光柵化 | 瀏覽器 Canvas / `OffscreenCanvas` | 無需額外函式庫 |
| 壓縮下載打包 | `fflate` | MIT，輕量 |

### 3.4 授權紅線
- **禁止**引入 AGPL / GPL 且會強迫整個專案改授權的相依（例如 Ghostscript、MuPDF），除非專案本身明確決定採用相同開源授權並經使用者同意。
- 新增任何相依前，必須確認：授權、體積（gzip 後）、是否為純本機執行、是否含遙測。
- 專案本身預設使用 **MIT** 授權，並維護 `THIRD_PARTY_LICENSES.md`。

### 3.5 ffmpeg.wasm 注意事項
- 靜態主機無法設定 COOP/COEP 標頭，因此：
  - 預設使用**單執行緒核心**（不需要 SharedArrayBuffer）。
  - 若要啟用多執行緒，可用 `coi-serviceworker` 方案，並且要提供自動降級。
- WASM 檔案必須**自行打包在專案內**（self-host），不得從 CDN 載入。
- 只在使用者進入影音模組並選擇檔案後才載入，**不得**影響首屏。
- 需處理記憶體上限：超過安全門檻（預設 1.5 GB）時，提前警告並拒絕，而非讓分頁當掉。

---

## 4. 轉換品質分級策略（重要：請誠實處理限制）

瀏覽器內做 Office ⇄ PDF 的高保真轉換本質上很困難。請以三個等級實作，並在 UI 上**誠實標示**每項轉換的品質等級。

- **Tier 1 — 高品質、輕量（必做）**
  PDF 合併/分割、圖片互轉與壓縮、影音互轉與壓縮、PDF → PPTX（頁面圖片版）、PDF 壓縮。
- **Tier 2 — 盡力而為（必做，但標示「版面可能略有差異」）**
  - PDF → DOCX：依文字座標與字級重建段落與標題，圖片保留。
  - PDF → XLSX：依文字座標對齊偵測表格欄列。
  - DOCX → PDF：`mammoth` 轉 HTML 後以列印樣式產生 PDF。
  - XLSX → PDF：讀取儲存格後排版輸出。
  - PPTX → PDF：解析 PPTX 內容，逐頁繪製輸出（簡單版型）。
- **Tier 3 — 高保真（選配，預設關閉）**
  提供「進階模式」，**按需下載**大型引擎（如 LibreOffice WASM）以提升 Office ⇄ PDF 保真度。
  - 必須明確告知使用者下載大小，並經使用者同意才載入。
  - 引擎檔案來源必須是專案自行託管，不得呼叫第三方伺服器。
  - 第一階段可先只放介面預留與文件，不必實作。

**掃描型 PDF（純圖片）**：預設不做 OCR。可在 Tier 3 之後評估 `tesseract.js`（語言包按需載入），不得列入第一版。

---

## 5. 隱私與安全規範（不可妥協）

1. **零網路傳輸**：處理流程中不得對外發送任何請求。
2. **嚴格 CSP**：`index.html` 與部署標頭（若可設定）需設定：
   `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`
   （如需微調，須在 PR 說明原因。）
3. **不使用**任何分析、追蹤、廣告、錯誤回報外部服務（GA、Sentry 等一律禁止）。
4. **不使用** Cookie；不將使用者檔案內容寫入 localStorage / IndexedDB。僅可儲存偏好設定（如主題、壓縮預設檔）。
5. 處理完成或使用者離開時，**主動釋放**記憶體：`URL.revokeObjectURL`、清除 Worker 內暫存、終止 Worker。
6. 所有依賴鎖定版本（lockfile 必須提交），啟用 `npm audit` 檢查；不使用有安裝後腳本（postinstall）風險而非必要的套件。
7. UI 上要有一個常駐的小標示：「🔒 檔案僅在你的裝置上處理，不會上傳」，並附簡短說明頁。
8. 處理中的檔案名稱不得寫入 console 以外的任何持久紀錄；正式版不輸出含檔案內容的 log。

---

## 6. 輕量化預算（違反需在 PR 說明）

| 項目 | 上限 |
|---|---|
| 首屏 JS（gzip） | ≤ 80 KB |
| 首屏 CSS（gzip） | ≤ 15 KB |
| 首屏總傳輸 | ≤ 150 KB（不含 WASM 與按需模組） |
| 各功能模組 | 動態 `import()` 切割，進入該功能才載入 |
| WASM / 大型引擎 | 僅在使用者需要時載入，載入前顯示大小 |

實作要求：
- 每個功能模組（pdf、media、image）獨立 chunk。
- 大檔案用 `Blob` / `ArrayBuffer` 傳遞，優先使用 Transferable 避免複製。
- 多檔任務使用佇列，**同時只跑一個重任務**，避免記憶體暴增。
- 提供進度條與「取消」按鈕（取消需真正終止 Worker）。
- CI 中加入 bundle 大小檢查，超標則失敗。

---

## 7. 介面與體驗規範

### 7.1 視覺風格：科技感但克制
- 預設**深色主題**，並支援淺色與跟隨系統。
- 色彩：深底（近黑藍）+ 單一霓虹強調色（青/藍綠系）；線條細、圓角適中、微光暈（glow）僅用於主要動作與焦點狀態。
- 字體：系統字型；數字與檔案大小使用等寬字型（系統 monospace）。
- 動效：輕微且可關閉；遵守 `prefers-reduced-motion`。

### 7.2 互動流程（三步驟原則）
1. **放入檔案**：首頁中央一個大型拖曳區（也可點擊選檔、貼上）。
2. **選擇動作**：依檔案類型自動列出可用的轉換/壓縮/合併/分割選項，只顯示相關選項。
3. **下載結果**：顯示前後大小對比、下載按鈕；多檔可打包 zip。

### 7.3 版面
- 首頁只有：拖曳區 + 四個分類入口（PDF / 影片音訊 / 圖片 / 設定）。
- 不使用側邊欄巢狀選單、不使用彈出式廣告式提示。
- 手機優先（響應式），觸控目標 ≥ 44px。
- 無障礙：鍵盤可操作、對比度符合 WCAG AA、加上適當 `aria-*`。
- 語言：**預設繁體中文**，架構上保留 i18n（字串集中於 `src/i18n/`），至少提供 zh-TW 與 en。

### 7.4 錯誤處理
- 錯誤訊息要用白話文，告訴使用者「發生什麼事」與「可以怎麼做」。
- 不支援的檔案、加密 PDF、檔案過大、記憶體不足、瀏覽器不支援，都要有明確提示，不可白畫面或無限轉圈。
- 密碼保護的 PDF：提示輸入密碼（密碼僅留在記憶體）。

---

## 8. 專案結構（建議）

```
/
├─ AGENTS.md
├─ README.md
├─ THIRD_PARTY_LICENSES.md
├─ package.json
├─ vite.config.ts
├─ public/
│  ├─ manifest.webmanifest
│  ├─ icons/
│  └─ wasm/                # self-host 的 ffmpeg / 圖像編碼 wasm
├─ src/
│  ├─ main.ts
│  ├─ app/                 # 外殼、路由、主題、佇列、進度
│  ├─ ui/                  # 共用元件（Dropzone、ProgressBar、FileCard…）
│  ├─ i18n/
│  ├─ core/                # 檔案類型偵測、任務佇列、Worker 通訊、大小格式化
│  ├─ modules/
│  │  ├─ pdf/              # merge, split, compress, to-docx, to-xlsx, to-pptx, from-office
│  │  ├─ media/            # convert, compress（ffmpeg.wasm 封裝）
│  │  └─ image/            # convert, compress, trace, rasterize
│  └─ workers/
├─ tests/
│  ├─ fixtures/            # 小型測試檔（合法、自製、無版權問題）
│  └─ ...
└─ .github/workflows/      # test + build + size-check + deploy
```

模組介面約定（每個轉換器都必須實作）：

```ts
interface Converter {
  id: string;                       // 例如 "pdf-to-docx"
  from: string[];                   // 例如 ["application/pdf"]
  to: string;                       // 目標 MIME
  tier: 1 | 2 | 3;                  // 品質等級，UI 會顯示
  run(input: File[], options: unknown, ctx: {
    onProgress(p: number): void;    // 0~1
    signal: AbortSignal;            // 支援取消
  }): Promise<Blob[]>;
}
```

---

## 9. 開發規範

- TypeScript strict，不使用 `any`（確有必要須附註解說明）。
- ESLint + Prettier，提交前自動檢查。
- 函式保持小而專一；每個轉換器一個檔案，不得出現超過 300 行的檔案（必要時拆分）。
- 不寫重複造輪子的工具函式；先檢查現有依賴是否已提供。
- 註解以繁體中文撰寫，變數與函式名使用英文。
- Commit 訊息使用 Conventional Commits（`feat:`、`fix:`、`chore:`…）。
- 一個 PR 只做一件事，並附上：變更說明、bundle 大小變化、測試結果。

---

## 10. 測試與驗收

### 10.1 自動化測試
- 單元測試：`vitest`，針對核心邏輯（頁碼範圍解析、檔案類型偵測、壓縮參數對應、大小格式化）。
- 轉換測試：以小型 fixture 驗證輸出**可被開啟**且基本內容正確（例如：合併後頁數 = 各檔頁數總和；分割後頁數正確；mp3 輸出檔頭合法）。
- E2E：`playwright`，覆蓋「拖入檔案 → 選項 → 下載」主流程。
- 隱私測試：E2E 中**監聽所有網路請求**，確認處理期間沒有任何對外請求（僅允許載入自身靜態資源）。此測試失敗即視為阻擋性錯誤。

### 10.2 完成定義（Definition of Done）
- [ ] 功能在最新版 Chrome、Edge、Firefox、Safari 可用（不支援之功能需優雅降級並提示）。
- [ ] 離線狀態下（首次載入後）核心功能可用。
- [ ] 通過隱私網路請求測試。
- [ ] 通過 bundle 大小檢查。
- [ ] 手機寬度下可完整操作。
- [ ] 錯誤情境皆有友善提示。
- [ ] README 與第三方授權清單已更新。

---

## 11. 開發里程碑（請依序進行，每階段完成後停下來回報）

**M0 — 骨架**
Vite + TS + PWA 外殼、主題、i18n、拖曳區、任務佇列、Worker 框架、CSP、CI（測試/大小檢查/部署）。

**M1 — 圖片模組（最輕量，先驗證整體流程）**
jpg ⇄ png、svg → png/jpg、圖片壓縮、png/jpg → svg（描摹）。

**M2 — PDF 基礎操作**
合併、分割（含縮圖選頁）、壓縮、PDF → PPTX（頁面圖片版）。

**M3 — 影音模組**
ffmpeg.wasm 整合、mp4/m4a/mp3 互轉、影音壓縮、記憶體防護與取消機制。

**M4 — PDF ⇄ Office（Tier 2）**
PDF → DOCX / XLSX；DOCX / XLSX / PPTX → PDF；標示品質等級。

**M5 — 打磨與發佈**
無障礙、效能調校、說明頁、隱私說明頁、README、正式部署。

**M6（選配）— Tier 3 進階模式**
按需載入高保真引擎；評估 OCR。

---

## 12. 明確禁止事項

- ❌ 建立或呼叫任何後端、雲端函式、第三方轉檔 API。
- ❌ 使用需付費或有額度限制的服務。
- ❌ 引入分析/追蹤/廣告/遠端字型/遠端腳本。
- ❌ 從 CDN 載入執行期程式碼或 WASM。
- ❌ 為了「看起來完成」而模擬轉換結果（假進度、輸出空檔）。做不到的功能必須標示為「尚未支援」。
- ❌ 在未說明的情況下增加大型相依。
- ❌ 使用真實使用者或具版權疑慮的檔案作為測試 fixture。

---

## 13. 給 Codex 的工作方式

1. 開始前先閱讀本文件與現有程式碼，簡述你的計畫再動手。
2. 遇到本文件未涵蓋或有多種合理做法的決策，**選擇最符合「隱私、零成本、輕量」的方案**，並在 PR / 回覆中說明取捨。
3. 遇到技術上無法達成的需求（例如某轉換品質不足），**如實回報並提出替代方案**，不要默默降低標準或假裝完成。
4. 每完成一個里程碑，回報：完成內容、bundle 大小、已知限制、下一步建議。
