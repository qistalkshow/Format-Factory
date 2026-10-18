# FormatFactory · 檔案格式處理工廠

純前端、零成本、隱私優先的檔案工具。支援圖片、影音與 PDF／Office，M5 補上雙語說明、鍵盤導覽、錯誤復原與版本更新提示。

## 開發與使用

建議使用 Node.js 24 LTS 與 npm；工具鏈要求 `^22.13.0 || ^24.0.0 || >=26.0.0`。

```sh
npm ci --ignore-scripts
npm run prepare
npm run dev
```

`.npmrc` 停用第三方安裝腳本。`prepare` 只在 Git 儲存庫存在時設定本機提交檢查。開啟指令顯示的 localhost 網址，不要直接雙擊 `index.html`。

1. 拖曳、點擊選檔或貼上圖片，也可先開啟首頁「圖片」入口。
2. 每檔選擇動作與設定，按「開始處理」或「處理全部待辦」。
3. 檢視大小、節省比例與前後對比，單檔下載或打包 ZIP。結果較大時可選原檔（原有中繼資料也會保留）。

| 功能            | 選項與品質                                                                               |
| --------------- | ---------------------------------------------------------------------------------------- |
| JPG ⇄ PNG       | Tier 1；透明轉 JPG 可選背景色，預設白色。轉 PNG 不會復原 JPEG 已失去的細節，檔案可能增大 |
| SVG → PNG / JPG | Tier 1；指定寬度或 1x / 2x / 4x，保持比例；寬度非 0 時優先於倍率                         |
| JPG 壓縮        | Tier 1；MozJPEG，低／中／高壓縮對應品質 90／75／50，可手動調整 1–100                     |
| PNG 壓縮        | Tier 1；Oxipng，低／中／高對應努力程度 1／2／4，可調整 0–6                               |
| JPG / PNG → SVG | Tier 2；明確標示近似向量化、非無損；黑白、8 色、24 色與細節滑桿                          |

可指定輸出寬度縮圖。主題支援深色／淺色／系統，語言支援繁體中文／英文，只有偏好設定寫入 localStorage。

## M2 PDF 使用與限制

1. 選擇 PDF，或開啟首頁 PDF 入口；每批只能使用圖片或 PDF 其中一個模組。切換模組會取消原工作並釋放結果。
2. 合併可拖曳檔案排序，也可用「往前移／往後移」按鈕。分割支援 `1-3,5` 範圍、每 N 頁一份、縮圖勾選（每組最多 12 頁，翻組後按載入）。範圍與勾選頁面依原頁碼排列，合成一份 PDF。
3. 壓縮／PPTX 執行前須確認頁面影像化的資訊損失。完成後可單檔下載，多份分割結果可打包 ZIP；壓縮變大時可下載原檔。
4. 正式預覽模式下，按「準備完整 PDF 離線資源」，等候完成後才能保證首次離線使用所有 PDF 引擎。只快取本站程式、字型與解碼資源，不儲存 PDF 內容或密碼。

PDF 合併／分割使用 `pdf-lib`，保留頁面原有文字與向量，但不保證書籤、表單互動與簽章；輸出不是惡意內容清洗器。`pdf-lib` 不支援解密，因此不使用 `ignoreEncryption` 強行讀取：加密文件需先用原應用程式匯出未加密副本，或輸入密碼改用下列影像輸出。

PDF 壓縮以 PDF.js 逐頁渲染為 JPEG，再重建 PDF；低／中／高分別為 144 DPI／品質 88%、110 DPI／72%、72 DPI／50%。這是有損影像壓縮，文字不可搜尋、向量不可編輯，表單、連結、註解與原中繼資料不保留，沒有 OCR，也不保證檔案變小。不同 PDF 的未嵌入字型、特殊色彩與複雜效果可能有差異；遇不支援的渲染內容會顯示錯誤。PDF → PPTX 每頁一張圖片，投影片以第一頁比例為準，其他比例置中留白；不產生可編輯文字。

PDF.js 的 display 與頁面繪製在本站 Worker，parser 在其子 Worker；沒有把大型運算移回 UI。支援密碼的動作會顯示密碼欄位，密碼僅留記憶體，轉換成功或清除後移除，輸出不再加密。取消終止工作 Worker；完成時清理解析器與 Canvas。原檔留在目前工作區供改設定／重試，清除、換檔、換模組或離開時釋放。

安全上限：單檔 64 MiB、每批 20 檔／128 MiB、最多 300 頁、單頁 1,200 萬像素／單邊 8,192 px、輸出合計 256 MiB、任務 3 分鐘。這些是工作量防護，無法對惡意 PDF 的解壓記憶體需求提供絕對保證。沒有 Worker Canvas 的瀏覽器可用合併及範圍／間隔分割；縮圖、影像壓縮及 PPTX 會提供升級瀏覽器提示。

PDF 資源不放入首頁預快取。`scripts/prepare-pdf.mjs` 從鎖定 npm 相依複製 PDF.js 資源，並用 `vendor/liberation-sans` 的官方 OFL 2.1.5 四款字型取代隨附的舊 GPL 字型。所有資源自行託管；Vite 開發伺服器也會先執行此步驟。建置產生精確 PDF 資源清單，供使用者明確準備離線。新版資源需重新準備；使用舊 Service Worker 時請關閉所有舊分頁再開啟。

M2 測試、體積、相依取捨與已知限制見 [M2_VERIFICATION.md](M2_VERIFICATION.md)。`scripts/create-pdf-fixtures.mjs` 產生合法自製 PDF；加密 fixture 由 `scripts/create-encrypted-fixture.py` 與開發用 pypdf 6.10.0（BSD-3-Clause）產生，固定測試密碼 `test-only`，不含真實資料，pypdf 不進入產品或 npm 相依。

## M3 影音使用與限制

1. 拖入 MP4、M4A、MP3，或先開啟「影片音訊」入口。每批最多 20 檔、合計 128 MiB；混合不同模組的檔案會要求分開選擇。
2. 選輸出格式；相同格式即為重新編碼壓縮。MP4 可抽音訊，M4A ⇄ MP3 可互轉；音訊轉 MP4 使用 640 × 360 黑底，不提供封面圖。
3. 低／中／高預設分別為 CRF 23／28／34、最大高度 1080／720／480、音訊 192／128／64 kbps。進階可調 CRF 18–40、影片位元率與音訊位元率。非 0 影片位元率取代 CRF，採目標位元率控制，不保證精確檔案大小。
4. 按「開始影音處理」逐檔執行；每檔可取消，完成可預覽、下載或 ZIP。結果變大可下載原檔。重新選檔、清除或切換模組會取消工作並釋放結果。
5. 第一次處理會下載本站約 31 MiB 的單執行緒核心（WASM gzip 約 9.81 MiB）。已選檔後可按「準備完整影音離線資源」；完成後可關閉網路、重新整理再轉換。僅開啟首頁或影音入口不下載核心。開發模式沒有 Service Worker，離線驗證請用 build + preview。

MP4 使用 H.264／AAC，M4A 使用 AAC，MP3 使用 LAME。保留第一條實際影片（排除封面附件）與第一條音訊，聲音輸出為 44.1 kHz 雙聲道。重新編碼有損，不保留原字幕、章節、封面附件或來源中繼資料；容器仍可能含編碼器自行產生的標籤。原檔下載保留其原資料。單執行緒採 ultrafast 以減少等待，壓縮效率通常不如桌面版慢速編碼。

每檔最長 1 小時、工作最長 10 分鐘、輸出每檔及批次保留結果合計最多 256 MiB。先檢查輸入大小與檔頭，再由 Worker 讀取音軌、時長、尺寸；估算核心、輸入／輸出副本及影格緩衝超過 1.5 GiB 即拒絕。上限是保守預估，不代表瀏覽器實際記憶體的硬隔離，也不能保證所有惡意媒體都不造成資源消耗。低記憶體裝置應先使用短片。

Worker 完成、失敗或取消皆 terminate，釋放 WASM 與虛擬檔案系統；沒有長駐核心實例。進度來自實際載入／檢查階段與 FFmpeg 處理時間，載入階段為不定進度。輸出重新讀取時長與大小，拒絕明顯截斷結果。瀏覽器若不支援結果編碼，預覽可能不可用，但可下載至支援的播放器；不代表原始內容可無損保留。

M3 測試、體積、實測壓縮結果見 [M3_VERIFICATION.md](M3_VERIFICATION.md)。測試素材由 scripts/create-media-fixtures.mjs 在瀏覽器內用色塊與正弦波自製。

### M3 授權與發布狀態

使用者已同意官方 GPL 核心；原有 MIT 程式碼通知保留，不能把含 GPL 核心的完整產品聲稱為僅 MIT。已同站提供 19 份固定來源封裝（共 108,701,982 B）、各 codec／runtime 授權、建置配方、核心版本證據，以及每次建置產生的本專案來源 ZIP。影音畫面的授權連結可下載。查核依據為官方 v12.15 配方、固定 commit、來源歷史與核心回報的編譯參數；未執行本機核心重建，不宣稱逐位元重現。

scripts/check-media-release.mjs 在 main 的 Pages 上傳前驗證 dist 內的來源清單、全部來源封裝與核心 SHA-256、npm 版本，以及應用程式 ZIP 與目前來源一致。任何缺檔、篡改或版本不一致均阻擋發布。來源封裝不列入首頁或引擎預快取。詳見 M3_ENGINE_DECISION.md 與 public/media-licenses/README.txt。

## 架構與安全

- Vite、strict TypeScript、Preact、原生 CSS；保留 M0 外殼與佇列，移除假轉換器。
- `src/modules/image/` 動態 import，五個 Converter 各自一檔，註冊於圖片 registry；`src/core/` 管理型別、單一重任務佇列與 Worker 通訊。
- JPG / PNG 解碼、編碼、壓縮、描摹及 ZIP 都在 Worker。取消會真正終止 Worker，完成或失敗也會終止。進度為實際工作階段，不用計時假進度；編碼器本身沒有連續進度回呼。
- SVG 依需求在主執行緒使用 Image + Canvas，因 Worker createImageBitmap 的 SVG 支援不一致。原始 SVG 從不插入 DOM；先以不啟用腳本的 DOMParser 驗證，再以 Blob 圖片繪製。拒絕腳本、事件、外部引用、use、內嵌圖片、濾鏡、動畫、DOCTYPE 等。此保守限制會拒絕部分合法 SVG。
- 單檔 64 MiB、每批 20 檔／128 MiB、輸入與輸出上限 1,600 萬像素及單邊 8,192 px；描摹自動縮至最多 262,144 像素及單邊 768 px。結果／ZIP 總量上限 256 MiB。GIF、APNG、不支援格式與損毀檔案有明確提示。
- 先檢查檔頭與尺寸，再交瀏覽器解碼；宣告 MIME 與內容不符會拒絕。Worker 兩分鐘逾時自動終止。SVG 同步繪圖受像素上限限制，無法在單次同步 Canvas 呼叫中途搶先取消。
- 保留原圖只供對比與選擇原檔下載；失敗／取消釋放輸入，清除、重新選檔、離開或卸載時撤銷所有 Blob URL 並釋放批次。沒有檔案內容持久化。
- 全部程式、WASM、圖示 self-host，沒有 CDN、分析、遠端字型或上傳。Production HTML 使用 AGENTS.md 原訂 CSP，無 unsafe-inline；開發模式排除 CSP 以支援 Vite HMR。GitHub Pages 不支援自訂 CSP header，因此採 meta。

## 壓縮與中繼資料取捨

PNG 選擇單執行緒 Oxipng，避免新增量化引擎、避免色彩量化損失，也不需 SharedArrayBuffer／COOP／COEP。其進階滑桿調整運算努力程度，而非有損品質。無損僅指 Canvas 輸出的 8-bit sRGB 像素；16-bit、廣色域、ICC 與透明像素的不可見色彩，不保證與原始檔逐位元一致。縮圖本身有損。

預設重新編碼移除 EXIF／GPS／文字等中繼資料。JPEG 由瀏覽器套用 EXIF 的八種方向；保留中繼資料時將方向改為 1 並更新尺寸，避免二次旋轉。選項只適用壓縮，支援 JPEG EXIF、標準 XMP、IPTC、COM，以及 PNG 文字欄位與 eXIf；不保留原 ICC，輸出為 sRGB。未知／廠商欄位、延伸 XMP、縮圖不保證保留。無法安全解析的 EXIF 會要求取消保留，不會默默複製錯誤方向。保留資料可能包含 GPS，UI 有明確說明。

自製有效圖片 `tests/fixtures/landscape.jpg`（合成風景，非實拍照片，1600 × 1000）在 Chromium 中以 JPEG 品質 75 實測：979,376 B → 166,334 B，節省 83.0%。不同圖片效果不同，也可能變大。

## PWA、離線與建置

```sh
npm run build
npm run preview
```

採用自製 Service Worker，沿用 M0，避免 PWA 外掛及其額外相依。建置時由內容 hash 產生精確靜態資源白名單。為了首次載入後可離線互轉，預快取小型 JS／CSS（含尚未執行的動態圖片模組）；這是離線需求與純按需傳輸間的明確取捨。模組仍延後 import／執行，首屏與實際預快取資源均受體積閘門限制；PDF 引擎另按需載入，不列入首頁預快取。

WASM 不預載；第一次按壓縮才下載對應編碼器，UI 事先顯示大小。成功請求後快取自身 WASM，之後才能離線壓縮；首次完全離線且未快取引擎時會提示。WASM 由 Vite 從 npm 套件打包至 `dist/assets/` 的 hash URL，避免人工複製版本不一致。一般互轉與描摹不需 WASM。

在 localhost／HTTPS 等候「基礎離線資源已就緒」，再離線重新整理。開發模式不註冊 SW。更新不使用 skipWaiting：請關閉所有舊分頁後重開以啟用新版。瀏覽器清除快取後需要重新連線。只快取白名單建置資源，不快取使用者檔案、任意請求、Cookie 或 IndexedDB。

## 測試與體積

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
npm audit
```

- Vitest 覆蓋格式偵測、像素／尺寸上限、透明背景合成、壓縮參數、EXIF、中繼資料、佇列、取消與 Worker 邊界。
- Playwright 使用 production build，檢查實際下載的 PNG／JPEG 魔術數字、尺寸、像素、可解析 SVG、八種 EXIF 方向、ZIP 內容、原檔選項、取消與錯誤提示。每個實際處理案例監聽網路並拒絕外部 HTTP(S) 請求。
- 離線測試會關閉獨立測試靜態主機，驗證頁面由 Service Worker 重新載入並能互轉、重用已快取的 WASM。測試主機不是產品後端。
- Fixtures 均由 `node scripts/create-image-fixtures.mjs` 自製，不使用真實使用者或有版權疑慮的圖片。
- `build` 內含首屏 JS gzip ≤ 80 KiB、CSS ≤ 15 KiB，另以實際首頁預快取靜態資源 gzip ≤ 150 KiB 作閘門（排除按需 PDF 引擎與 WASM）。報告以 Node zlib gzip 為準。
- Windows 的 Playwright WebKit 若缺少 Worker Canvas，真實轉換案例會按能力標記跳過，另驗證可理解的錯誤提示；跳過不等於功能通過。Firefox 若遇 Windows 並列設定錯誤，可使用下方獨立官方測試副本，不移除或忽略案例。Edge、Safari／iOS 真機及輔助技術仍需人工驗收。

## GitHub Pages 部署

1. 建立 GitHub 公開儲存庫，提交原始碼與 lockfile，不提交 node_modules／dist。
2. Settings → Pages 選 GitHub Actions。
3. 推送 main；現有工作流程執行 audit、lint、typecheck、test、build／size-check、E2E，全部通過且 GPL 對應來源碼發布檢查通過後部署。

部署目標為 [Afang1105/Format-Factory](https://github.com/Afang1105/Format-Factory)。CI 從 GITHUB_REPOSITORY 設定 `BASE_PATH=/Format-Factory/`；使用者站 `*.github.io` 使用 `/`。自訂網域需將 base 明確改為 `/`。發布狀態見 M5_VERIFICATION.md，測試通過不代表已上線。

```powershell
$env:BASE_PATH='/Format-Factory/'
npm run build
npm run test:e2e
Remove-Item Env:BASE_PATH
```

## M4：PDF ⇄ Office（Tier 2）

放入 PDF 後選擇 DOCX 或 XLSX；放入 Office 檔案後只顯示相應的 PDF 動作。同格式 Office 可批次處理及 ZIP 下載。確認畫面上的品質限制後開始，取消會終止 Worker。設定、進度及錯誤均提供繁中／英文。

| 動作       | 已支援                                                           | 明確限制                                                                                             |
| ---------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| PDF → DOCX | 可編輯文字、依字級判斷標題、對齊表格、內嵌點陣圖片               | 保留一般圖片座標、頁面尺寸及基本字體樣式；向量、剪裁、精確字型與多欄閱讀順序不保證。另有整頁圖片模式 |
| PDF → XLSX | 文字座標分欄、簡單對齊表格、每頁一個工作表                       | 無表格時輸出文字；不做 OCR，純掃描頁沒有可辨識文字                                                   |
| DOCX → PDF | Mammoth 解析段落、標題、清單、簡單表格、PNG／JPEG                | 系統字型重排；拒絕無法處理的物件，合併儲存格表格不支援                                               |
| XLSX → PDF | 可見工作表、儲存格值、已有快取的公式結果、寬表分欄帶             | 不執行公式，不保留精確數字格式、合併版面或原列印設定；圖表／繪圖拒絕處理                             |
| PPTX → PDF | 簡單文字框、矩形、內嵌 PNG／JPEG、簡單表格、旋轉／翻轉與圖片裁切 | 不還原完整佈景／母片／群組／SmartArt；缺少明確位置或文字溢出時提示不支援                             |

**Office → PDF 輸出是頁面圖片，文字不可搜尋或選取。** DOCX 先透過 Mammoth 產生 HTML，再於 Worker 以白名單讀取內容，依一致分節的紙張尺寸與邊界重排，保留段落／簡單表格內粗體、斜體、底線及上下標；不同尺寸或邊界的分節會明確拒絕。相較瀏覽器原生列印，此方案可直接下載、維持佇列與真正取消，且不把不可信 HTML 插入頁面；取捨是沒有原生 CSS 列印的字型／排版保真度。PPTX 使用原投影片尺寸。需要高保真或可搜尋文字時，請使用原 Office 應用程式匯出；本階段沒有 Tier 3 引擎。

輸入以 ZIP／OOXML 內容驗證，不只信任副檔名。限制為 Office 單檔 32 MiB、ZIP 展開 64 MiB／2,000 項目、單項 16 MiB、最多 100 頁、20,000 儲存格與總文字 100 萬字元。拒絕巨集、內嵌物件、DTD／實體宣告、路徑跳脫及外部圖片／資料關聯；超連結僅保留文字。舊版 DOC／XLS／PPT 與加密 Office 不支援。PDF 密碼沿用記憶體設定；不記錄文件內容。

M4 重型程式全部動態載入，沒有新增 WASM 或遠端字型。ExcelJS、JSZip 共享 chunk 與 Office worker chunks 納入 PDF 按需離線清單，不進首頁預快取。「準備完整 PDF 離線資源」包含 Office 引擎；首次使用前先連線準備，才可完全離線轉換。

新增相依：docx 9.12.0（MIT，npm gzip 4,938,882 B）、exceljs 4.4.0（MIT，4,716,975 B）、mammoth 1.13.0（BSD-2-Clause，438,003 B）、@xmldom/xmldom 0.9.12（MIT，109,708 B）。這是 npm 封裝，實際 chunk 體積見 M4_VERIFICATION.md。XML 解析器是為 Worker 補上 DOM API，不使用瀏覽器頁面 DOM，也沒有網路能力。

npm audit 目前有 5 項 moderate、0 high／critical；其中 sprintf-js／argparse 屬 Mammoth 的 Node CLI 相依，網站未載入 CLI；ExcelJS 僅呼叫 UUID v4，未使用通報的 v3／v5／v6 buffer API。沒有以強制降級消除通報；詳見 THIRD_PARTY_LICENSES.md，需持續追蹤上游修補。

自製測試資料由 `node scripts/create-office-fixtures.mjs` 產生，不使用使用者或第三方文件。測試檢查 DOCX 可再解析、表格／圖片、XLSX 欄位值、PDF 可解析及非空影像、離線、取消重跑、批次 ZIP 與零外部請求。

## 授權與範圍

原有程式碼 MIT；M3 核心 GPL，完整產品發布需遵循其義務。新增相依用途、版本、gzip 封裝大小與完整授權清單見 THIRD_PARTY_LICENSES.md；網站隨附 THIRD_PARTY_NOTICES.txt。

This software is based in part on the work of the Independent JPEG Group.

M4 的驗證與已知限制見 M4_VERIFICATION.md。

## M5 打磨與發布

- 頁尾「使用說明」提供三步驟操作、格式／品質、離線準備、鍵盤與疑難排解；「隱私說明」涵蓋檔案生命週期、靜態主機存取紀錄與中繼資料限制。兩頁均提供繁體中文／英文。
- 跳至主要內容、子頁與模組焦點、深淺色控制項對比、320 px 版面與 reduced-motion 有瀏覽器測試；不是完整 WCAG 認證，仍需真實螢幕閱讀器驗收。
- 新版 Service Worker 等待時顯示提示，不強制重新整理或清除結果。先下載結果，再關閉本站所有分頁並重開；新版引擎需重新準備離線。
- 工具呈現錯誤由 Error Boundary 隔離，可清除工作恢復；載入失敗可重試。JavaScript 無法啟動時保留雙語靜態提示，避免完全空白。
- 授權全文不再隨首頁預快取，仍完整 self-host 並隨正式產物提供；點閱後才快取，首次點閱需連線。沒有新增相依、WASM、字型或遙測。
- CI 在所有建置檢查 GPL 對應來源，失敗測試 trace 保存 7 天（只使用自製 fixture）。不發布開發快取、debug log 或測試結果。

本階段不啟用 M6、OCR 或大型高保真引擎。完整驗收與發布狀態見 [M5_VERIFICATION.md](M5_VERIFICATION.md)。

### Windows Firefox 測試路徑問題

本機標準快取路徑遇到 Windows 並列組態錯誤；同內容的獨立路徑可啟動，並非網站轉換錯誤。只在遇到此環境問題時使用以下方式；CI 保持預設 Playwright 安裝。

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.cache/browser-repair"
npx playwright install firefox
Remove-Item Env:PLAYWRIGHT_BROWSERS_PATH
# 版本目錄以 install 輸出的實際位置為準。
$env:PLAYWRIGHT_FIREFOX_EXECUTABLE_PATH = "$PWD/.cache/browser-repair/firefox-1543/firefox/firefox.exe"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_FIREFOX_EXECUTABLE_PATH
```

## PDF／Office 格式修正（2026-10-17）

PDF → DOCX 提供「Word 版面模式」：

- **可編輯文字（預設）**：每頁使用原 PDF 紙張尺寸與方向；左／上文字邊界由內容位置推定，並非還原原 Word 的邊界設定。保留可辨識的字型名稱、粗斜體、字級與混合文字片段，依基線推定上下標；辨識貼近文字且等寬的簡單水平底線。一般點陣圖片按頁面座標及尺寸放置，重複圖片不再遺漏。段落間距與欄位定位依座標重建。
- **保留頁面外觀**：將每頁以最高 144 DPI 的 PNG 嵌入相同尺寸的 Word 頁面，維持圖片、向量、上下標、底線及內容位置的外觀。**不是可編輯文字，也不可搜尋或供螢幕閱讀器讀取內文**；沒有 OCR。PDF 註解／表單外觀不在目前頁面渲染範圍內。檔案可能變大；輸出圖片合計最多 64 MiB、100 頁，每邊最多 22 英吋。

可編輯模式仍是 Tier 2：不嵌入原字型，缺字型時由 Word 替代；文字顏色目前為黑色；旋轉、遮罩、剪裁、複雜底線、向量圖形、密集多欄與表格結構不保證。PDF 沒有 Word 的段落、邊界和上下標語意，不能承諾「完全可編輯且像素一致」。需要外觀一致請明確選擇整頁圖片模式；需要完整編輯保真請使用原始 Office 文件。

相關修正也涵蓋 DOCX → PDF 的段落／簡單表格混合字體樣式與一致分節的紙張／邊界，以及 XLSX → PDF 的儲存格基本粗斜體、底線與上下標。XLSX 的欄寬、合併儲存格、數字顯示格式與 PDF → XLSX 的格式重建仍有限制，不能當成保真轉換。PPTX 文字段落亦保留混合粗斜體、底線、上下標與直接指定的文字顏色；仍只支援簡單版型，同段落混合字級、主題繼承及表格的細部格式仍不完整。

沒有新增相依、WASM、遠端資源或服務。新增自製格式測試資料可用 `node scripts/create-format-fixtures.mjs` 重建；回歸測試為 `tests/unit/office-format.test.ts` 與 `tests/e2e/office-format.spec.ts`。API 依照鎖定版本的 [docx 文件](https://docx.js.org/api/) 與 [PDF.js API](https://mozilla.github.io/pdf.js/api/)；底線推定使用鎖定 PDF.js 6 的 operator list，升級時需重跑格式測試。

## 其他功能優化（2026-10-17）

- XLSX → PDF 改用儲存格的數字顯示格式，保留百分比、金額、日期、前導零與分數；公式只使用檔內既有結果，不執行公式。隱藏列／欄不輸出；依來源欄寬比例排版，超過頁面時縮小欄寬。欄寬為系統字型下的近似換算；合併儲存格、完整列印設定、主題及條件格式仍不保證。未指定的日期語系使用英文，明確指定的數字格式優先。
- PPTX → PDF 保留同段落混合字級、水平／垂直對齊、文字方塊內距，以及簡單表格的列高／欄寬與基本行內樣式。表格依實際列高更新外框，與本機 PowerPoint 對自製 fixture 的解讀一致。空白線條設定不再額外畫出文字方塊邊框。主題繼承、合併表格、複雜圖形及自動縮字仍有限制；放不下的內容會明確拒絕，不默默截斷。
- PDF 離線資源最多同時下載 4 個，影音最多 2 個；下載時逐塊讀取，避免額外保留完整 WASM 副本。開始下載前驗證整份清單皆為本站路徑；失敗或取消會停止其餘下載。轉換佇列仍只執行一個重任務。

新增 `numfmt 4.0.1`，用於 Excel 數字格式，MIT、無執行期相依／安裝腳本，純本機執行。完整瀏覽器 ESM gzip 46,534 B；實際 tree-shaking 後含轉換程式的 XLSX 匯入 chunk gzip 34,103 B，僅按需載入。詳見 [官方文件](https://github.com/borgar/numfmt) 與 THIRD_PARTY_LICENSES.md。沒有新增 WASM 或遠端服務。

### 可編輯 DOCX 圖片錨點修正（2026-10-18）

圖片的絕對頁面座標並不足以固定所在頁：Word 仍會讓圖片與其錨點段落保持同頁。原轉換器將圖片段落放在正文末尾，正文溢頁時圖片也跟著移頁。現在每個來源 PDF 頁面以頁首的獨立、極小段落承載所有圖片錨點，鎖定錨點並保留原始座標／尺寸；文字仍可編輯，不改成整頁圖片。另修正 PDF.js 跨頁共用圖片應讀取 commonObjs 的問題，避免等待錯誤暫存區而卡住。

自製雙頁密集測試在 Microsoft Word 中，舊錨點配置的圖片位於輸出第 2／4 頁，修正後位於各來源頁內容起點的第 1／3 頁，座標保持 x=420 pt、y=162／362 pt。這是錨點回歸測試，不代表文字分頁已完全還原：密集文字仍可能因字型／行距推定而增加頁數；刪除錨點段落或大幅重排仍會影響 Word 頁面。使用者原始 PDF 尚未提供，因此未聲稱其完整文件已通過驗收。

沒有新增相依或網路資源。測試 fixture 可用 `node scripts/create-anchor-fixture.mjs` 重建；`tests/e2e/image-anchors.spec.ts` 檢查每頁圖片錨點在正文之前、座標／鎖定設定、跨頁共用圖片與可編輯文字。Word 行為依照 [Shape.Anchor 官方文件](https://learn.microsoft.com/en-us/office/vba/api/word.shape.anchor)。

### 原字型與 GitHub 改名（2026-10-18）

PDF → DOCX 可編輯模式預設逐文字片段使用可辨識的原字型。PDF 子集前綴會移除，已驗證的 PostScript 名稱會還原為同一字型的家族名稱，例如 `DFKaiShu-SB-Estd-BF` → `DFKai-SB`（標楷體）、`ArialMT` → `Arial`；不認識的家族名稱保留，不統一換成預設字型。中英文與複雜文字的 Word 字型欄位均由既有 docx 引擎寫入。沒有下載、內嵌或重新發布字型；電腦缺少該字型時仍由 Word 代用，無法承諾完全相同外觀。

儲存庫已確認改名為 [Afang1105/Format-Factory](https://github.com/Afang1105/Format-Factory)，新網站為 [afang1105.github.io/Format-Factory](https://afang1105.github.io/Format-Factory/)。專案 base 仍為 `/Format-Factory/`；Git 遠端與文件連結同步更新。新網域是不同 origin，舊網域的偏好與離線快取不會自動搬移，請在新網址重新準備離線資源。舊網址不保證重新導向。
