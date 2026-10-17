# 第三方相依與授權

原有專案程式碼保留 MIT；M3 經使用者同意加入 GPL 核心，不能將完整含核心產品描述為僅 MIT。以下版本由 package-lock.json 固定。查核日期：2026-10-17。

## 直接相依

gzip 封裝體積由 npm 官方 registry 的 npm pack 套件@版本 --dry-run --json 所回傳 size 取得，表示 .tgz 的壓縮大小，**不是瀏覽器 bundle 大小**，也不包含間接相依。開發相依全部只於本機／CI 執行，正式網站傳輸貢獻為 0 B。

| 套件              | 版本    | 授權             | npm gzip 封裝大小 | 用途                                              |
| ----------------- | ------- | ---------------- | ----------------: | ------------------------------------------------- |
| preact            | 10.29.8 | MIT              |         407,547 B | 元件、Hooks、JSX runtime                          |
| vite              | 8.3.1   | MIT              |         586,488 B | 開發伺服器與產物切割／建置                        |
| vitest            | 5.0.2   | MIT              |         690,055 B | 核心與 Worker 邊界單元測試                        |
| eslint            | 10.11.0 | MIT              |         627,973 B | 程式碼靜態檢查                                    |
| @eslint/js        | 10.0.1  | MIT              |           4,193 B | ESLint 官方 JavaScript 規則                       |
| typescript-eslint | 8.71.0  | MIT              |           9,373 B | TypeScript ESLint parser／規則整合                |
| prettier          | 3.9.9   | MIT              |       2,801,547 B | 格式化與格式檢查                                  |
| @playwright/test  | 1.63.0  | Apache-2.0       |           8,749 B | E2E、瀏覽器自動化及隱私檢查                       |
| @types/node       | 26.6.3  | MIT              |         470,935 B | 建置與測試工具 Node.js 型別                       |
| typescript        | 6.0.3   | Apache-2.0       |       4,515,854 B | strict 型別檢查                                   |
| @jsquash/jpeg     | 1.6.0   | Apache-2.0       |         157,933 B | Worker 中的 MozJPEG WASM 編碼                     |
| @jsquash/oxipng   | 2.3.0   | Apache-2.0       |         192,200 B | Worker 中的單執行緒 PNG 無損最佳化                |
| imagetracerjs     | 1.2.6   | Unlicense        |       3,079,354 B | Worker 中的近似向量描摹                           |
| fflate            | 0.8.3   | MIT              |         173,034 B | Worker 中打包 ZIP                                 |
| pdf-lib           | 1.17.1  | MIT              |       4,226,739 B | Worker 中保留原頁面合併／分割與建立影像 PDF       |
| pdfjs-dist        | 6.3.289 | Apache-2.0       |       8,503,425 B | Worker 中解析 PDF、密碼處理與頁面渲染             |
| pptxgenjs         | 4.0.1   | MIT              |         813,698 B | Worker 中建立每頁圖片版 PPTX                      |
| @ffmpeg/ffmpeg    | 0.12.15 | MIT              |          18,455 B | 影音 Worker 通訊與核心載入（MIT 包裝層）          |
| @ffmpeg/core      | 0.12.10 | GPL-2.0-or-later |      20,634,719 B | 單執行緒影音解碼、編碼與壓縮（GPL 核心）          |
| docx              | 9.12.0  | MIT              |       4,938,882 B | Worker 中建立可編輯 DOCX                          |
| exceljs           | 4.4.0   | MIT              |       4,716,975 B | Worker 中讀寫 XLSX 與公式快取值                   |
| mammoth           | 1.13.0  | BSD-2-Clause     |         438,003 B | Worker 中將 DOCX 轉為簡化 HTML，禁止外部檔案      |
| @xmldom/xmldom    | 0.9.12  | MIT              |         109,708 B | Worker 中解析 OOXML 與隔離的 HTML，不插入頁面 DOM |

Preact 的瀏覽器程式碼包含核心、hooks 與 JSX runtime，未合併時分別 gzip 為 4,836／1,546／985 B。實際合併與 tree-shaking 後體積以 npm run size-check 為準，不能把 .tgz 封裝大小當成首屏傳輸量。其 MIT 版權全文同時放於 public/THIRD_PARTY_NOTICES.txt，隨網站自託管。

## 執行與隱私檢查

- 正式網站引入 Preact 與上述圖片／PDF／ZIP 相依，無 CDN、遙測、分析、遠端字型或外部請求；運算在本機完成。PDF 引擎獨立按需載入。
- PDF.js 隨附的舊 GPL Liberation 字型不部署，改用 vendor/liberation-sans 的官方 2.1.5 OFL-1.1 字型；四款字型只用於本機 PDF 渲染，不套用於 UI。來源與封裝 SHA-256 見該目錄 README。PDF.js 的 Foxit 字型、CMap、影像 codec 與 ICC 授權通知保留於自託管資源目錄。
- PptxGenJS 的 image-size 間接相依以 overrides 固定 2.0.4，避開 1.x 的已知 DoS 漏洞；PptxGenJS 瀏覽器 ESM 僅匯入 JSZip，不使用此 Node 尺寸 API。JSZip 採其 MIT 選項，並保留 pako 的 MIT / Zlib 與其他實際打包相依通知。
- 開發工具可能依命令連線（npm registry、audit、Playwright 官方瀏覽器下載），不進入網站執行期。
- .npmrc 設定 ignore-scripts=true，安裝與 CI 明確停用套件安裝腳本；未執行第三方 postinstall。
- M3 的 @ffmpeg/core 為使用者已同意的 GPL-2.0-or-later 核心，包裝層 MIT。核心與 wrapper 自託管，沒有 CDN 回退；只在選檔後開始處理或準備離線才下載。核心原始 32,232,419 B／gzip 10,287,551 B；JS loader 原始 111,804 B／gzip 29,696 B。19 份固定來源封裝、codec/runtime 授權與建置配方隨站提供；發布閘門查核全部來源及核心雜湊與應用來源。查核依據為發布配方、來源歷史與核心編譯參數，未聲稱逐位元重建；見 public/media-licenses/README.txt 與 M3_ENGINE_DECISION.md。
- MozJPEG 底層另含 IJG、BSD-3-Clause、Zlib 授權；Oxipng 底層為 MIT。既有 codec 與執行期相依通知置於 public/THIRD_PARTY_NOTICES.txt。This software is based in part on the work of the Independent JPEG Group.
- Playwright 測試瀏覽器及輔助 binary 有各自授權，不部署到網站，也不是產品影音引擎。
- 自製 Service Worker、PNG／SVG 圖示與測試 fixture 不增加第三方相依。
- M4 的 npm audit 有 5 項 moderate、0 high／critical：sprintf-js 的精度參數 DoS 經 argparse 影響 Mammoth 的 Node CLI（網站不載入 CLI）；uuid 的 v3/v5/v6 buffer 檢查問題經 ExcelJS 傳遞，ExcelJS 僅使用 v4 產生識別碼，未呼叫受影響 API。尚未有完整且已驗證的全鏈修補組合，未使用 audit fix --force 降級主套件。瀏覽器依賴仍需持續追蹤，不能宣稱零漏洞。

## Lockfile 完整相依清單

包含間接與各平台 optional 套件；本機不一定安裝所有 optional binary。各套件完整 LICENSE／NOTICE 隨 npm 套件附帶，詳見 node_modules 對應目錄。以 lockfile 為版本真實來源。

| 套件路徑                                                        | 版本     | SPDX 授權                 |
| --------------------------------------------------------------- | -------- | ------------------------- |
| @cacheable/memory                                               | 2.2.0    | MIT                       |
| @cacheable/utils                                                | 2.5.0    | MIT                       |
| @eslint-community/eslint-utils                                  | 4.10.1   | MIT                       |
| @eslint-community/eslint-utils/node_modules/eslint-visitor-keys | 3.4.3    | Apache-2.0                |
| @eslint-community/regexpp                                       | 4.12.2   | MIT                       |
| @eslint/config-array                                            | 0.23.5   | Apache-2.0                |
| @eslint/config-helpers                                          | 0.7.0    | Apache-2.0                |
| @eslint/core                                                    | 1.2.1    | Apache-2.0                |
| @eslint/js                                                      | 10.0.1   | MIT                       |
| @eslint/object-schema                                           | 3.0.5    | Apache-2.0                |
| @eslint/plugin-kit                                              | 0.7.3    | Apache-2.0                |
| @fast-csv/format                                                | 4.3.5    | MIT                       |
| @fast-csv/format/node_modules/@types/node                       | 14.18.63 | MIT                       |
| @fast-csv/parse                                                 | 4.3.6    | MIT                       |
| @fast-csv/parse/node_modules/@types/node                        | 14.18.63 | MIT                       |
| @ffmpeg/core                                                    | 0.12.10  | GPL-2.0-or-later          |
| @ffmpeg/ffmpeg                                                  | 0.12.15  | MIT                       |
| @ffmpeg/types                                                   | 0.12.4   | MIT                       |
| @humanfs/core                                                   | 0.19.2   | Apache-2.0                |
| @humanfs/node                                                   | 0.16.8   | Apache-2.0                |
| @humanfs/types                                                  | 0.15.0   | Apache-2.0                |
| @humanwhocodes/module-importer                                  | 1.0.1    | Apache-2.0                |
| @humanwhocodes/retry                                            | 0.4.3    | Apache-2.0                |
| @jridgewell/resolve-uri                                         | 3.1.2    | MIT                       |
| @jridgewell/sourcemap-codec                                     | 1.6.0    | MIT                       |
| @jridgewell/trace-mapping                                       | 0.3.31   | MIT                       |
| @jsquash/jpeg                                                   | 1.6.0    | Apache-2.0                |
| @jsquash/oxipng                                                 | 2.3.0    | Apache-2.0                |
| @keyv/bigmap                                                    | 1.3.1    | MIT                       |
| @keyv/serialize                                                 | 1.1.1    | MIT                       |
| @napi-rs/canvas                                                 | 1.0.10   | MIT                       |
| @napi-rs/canvas-android-arm64                                   | 1.0.10   | MIT                       |
| @napi-rs/canvas-darwin-arm64                                    | 1.0.10   | MIT                       |
| @napi-rs/canvas-darwin-x64                                      | 1.0.10   | MIT                       |
| @napi-rs/canvas-linux-arm-gnueabihf                             | 1.0.10   | MIT                       |
| @napi-rs/canvas-linux-arm64-gnu                                 | 1.0.10   | MIT                       |
| @napi-rs/canvas-linux-arm64-musl                                | 1.0.10   | MIT                       |
| @napi-rs/canvas-linux-riscv64-gnu                               | 1.0.10   | MIT                       |
| @napi-rs/canvas-linux-x64-gnu                                   | 1.0.10   | MIT                       |
| @napi-rs/canvas-linux-x64-musl                                  | 1.0.10   | MIT                       |
| @napi-rs/canvas-win32-arm64-msvc                                | 1.0.10   | MIT                       |
| @napi-rs/canvas-win32-x64-msvc                                  | 1.0.10   | MIT                       |
| @oxc-project/types                                              | 0.151.0  | MIT                       |
| @pdf-lib/standard-fonts                                         | 1.0.0    | MIT                       |
| @pdf-lib/upng                                                   | 1.0.1    | MIT                       |
| @playwright/test                                                | 1.63.0   | Apache-2.0                |
| @rolldown/binding-android-arm-eabi                              | 1.2.11   | MIT                       |
| @rolldown/binding-android-arm64                                 | 1.2.11   | MIT                       |
| @rolldown/binding-darwin-arm64                                  | 1.2.11   | MIT                       |
| @rolldown/binding-darwin-x64                                    | 1.2.11   | MIT                       |
| @rolldown/binding-freebsd-x64                                   | 1.2.11   | MIT                       |
| @rolldown/binding-linux-arm-gnueabihf                           | 1.2.11   | MIT                       |
| @rolldown/binding-linux-arm64-gnu                               | 1.2.11   | MIT                       |
| @rolldown/binding-linux-arm64-musl                              | 1.2.11   | MIT                       |
| @rolldown/binding-linux-ppc64-gnu                               | 1.2.11   | MIT                       |
| @rolldown/binding-linux-s390x-gnu                               | 1.2.11   | MIT                       |
| @rolldown/binding-linux-x64-gnu                                 | 1.2.11   | MIT                       |
| @rolldown/binding-linux-x64-musl                                | 1.2.11   | MIT                       |
| @rolldown/binding-openharmony-arm64                             | 1.2.11   | MIT                       |
| @rolldown/binding-win32-arm64-msvc                              | 1.2.11   | MIT                       |
| @rolldown/binding-win32-x64-msvc                                | 1.2.11   | MIT                       |
| @rolldown/pluginutils                                           | 1.0.1    | MIT                       |
| @types/chai                                                     | 5.2.3    | MIT                       |
| @types/deep-eql                                                 | 4.0.2    | MIT                       |
| @types/esrecurse                                                | 4.3.1    | MIT                       |
| @types/estree                                                   | 1.0.9    | MIT                       |
| @types/json-schema                                              | 7.0.15   | MIT                       |
| @types/node                                                     | 26.6.3   | MIT                       |
| @typescript-eslint/eslint-plugin                                | 8.71.0   | MIT                       |
| @typescript-eslint/eslint-plugin/node_modules/ignore            | 7.0.10   | MIT                       |
| @typescript-eslint/parser                                       | 8.71.0   | MIT                       |
| @typescript-eslint/project-service                              | 8.71.0   | MIT                       |
| @typescript-eslint/scope-manager                                | 8.71.0   | MIT                       |
| @typescript-eslint/tsconfig-utils                               | 8.71.0   | MIT                       |
| @typescript-eslint/type-utils                                   | 8.71.0   | MIT                       |
| @typescript-eslint/types                                        | 8.71.0   | MIT                       |
| @typescript-eslint/typescript-estree                            | 8.71.0   | MIT                       |
| @typescript-eslint/utils                                        | 8.71.0   | MIT                       |
| @typescript-eslint/visitor-keys                                 | 8.71.0   | MIT                       |
| @vitest/mocker                                                  | 5.0.2    | MIT                       |
| @vitest/spy                                                     | 5.0.2    | MIT                       |
| @xmldom/xmldom                                                  | 0.9.12   | MIT                       |
| acorn                                                           | 8.18.0   | MIT                       |
| acorn-jsx                                                       | 5.3.2    | MIT                       |
| ajv                                                             | 6.15.0   | MIT                       |
| archiver                                                        | 5.3.2    | MIT                       |
| archiver-utils                                                  | 2.1.0    | MIT                       |
| archiver/node_modules/readable-stream                           | 3.6.2    | MIT                       |
| argparse                                                        | 1.0.10   | MIT                       |
| array-buffer-byte-length                                        | 1.0.2    | MIT                       |
| arraybuffer.prototype.slice                                     | 1.0.4    | MIT                       |
| assertion-error                                                 | 2.0.1    | MIT                       |
| async                                                           | 3.2.6    | MIT                       |
| async-function                                                  | 1.0.0    | MIT                       |
| available-typed-arrays                                          | 1.0.7    | MIT                       |
| balanced-match                                                  | 4.0.4    | MIT                       |
| base64-js                                                       | 1.5.1    | MIT                       |
| big-integer                                                     | 1.6.52   | Unlicense                 |
| binary                                                          | 0.3.0    | MIT                       |
| bl                                                              | 4.1.0    | MIT                       |
| bl/node_modules/readable-stream                                 | 3.6.2    | MIT                       |
| bluebird                                                        | 3.4.7    | MIT                       |
| brace-expansion                                                 | 5.0.12   | MIT                       |
| buffer                                                          | 5.7.1    | MIT                       |
| buffer-crc32                                                    | 0.2.13   | MIT                       |
| buffer-indexof-polyfill                                         | 1.0.2    | MIT                       |
| buffers                                                         | 0.1.1    | 查閱套件授權檔            |
| cacheable                                                       | 2.5.0    | MIT                       |
| call-bind                                                       | 1.0.9    | MIT                       |
| call-bind-apply-helpers                                         | 1.0.2    | MIT                       |
| call-bound                                                      | 1.0.4    | MIT                       |
| chai                                                            | 6.2.2    | MIT                       |
| chainsaw                                                        | 0.1.0    | MIT/X11                   |
| compress-commons                                                | 4.1.2    | MIT                       |
| compress-commons/node_modules/readable-stream                   | 3.6.2    | MIT                       |
| concat-map                                                      | 0.0.1    | MIT                       |
| core-util-is                                                    | 1.0.3    | MIT                       |
| crc-32                                                          | 1.2.2    | Apache-2.0                |
| crc32-stream                                                    | 4.0.3    | MIT                       |
| crc32-stream/node_modules/readable-stream                       | 3.6.2    | MIT                       |
| cross-spawn                                                     | 7.0.6    | MIT                       |
| data-view-buffer                                                | 1.0.2    | MIT                       |
| data-view-byte-length                                           | 1.0.2    | MIT                       |
| data-view-byte-offset                                           | 1.0.1    | MIT                       |
| dayjs                                                           | 1.11.23  | MIT                       |
| debug                                                           | 4.4.3    | MIT                       |
| deep-is                                                         | 0.1.4    | MIT                       |
| define-data-property                                            | 1.1.4    | MIT                       |
| define-properties                                               | 1.2.1    | MIT                       |
| detect-libc                                                     | 2.1.2    | Apache-2.0                |
| dingbat-to-unicode                                              | 1.0.2    | BSD-2-Clause              |
| docx                                                            | 9.12.0   | MIT                       |
| docx/node_modules/nanoid                                        | 6.0.2    | MIT                       |
| duck                                                            | 0.1.12   | BSD                       |
| dunder-proto                                                    | 1.0.1    | MIT                       |
| duplexer2                                                       | 0.1.4    | BSD-3-Clause              |
| end-of-stream                                                   | 1.4.5    | MIT                       |
| es-abstract                                                     | 1.24.2   | MIT                       |
| es-abstract-get                                                 | 1.0.0    | MIT                       |
| es-define-property                                              | 1.0.1    | MIT                       |
| es-errors                                                       | 1.3.0    | MIT                       |
| es-module-lexer                                                 | 2.3.2    | MIT                       |
| es-object-atoms                                                 | 1.1.2    | MIT                       |
| es-set-tostringtag                                              | 2.1.0    | MIT                       |
| es-to-primitive                                                 | 1.3.4    | MIT                       |
| escape-string-regexp                                            | 4.0.0    | MIT                       |
| eslint                                                          | 10.11.0  | MIT                       |
| eslint-scope                                                    | 9.1.2    | BSD-2-Clause              |
| eslint-visitor-keys                                             | 5.0.1    | Apache-2.0                |
| espree                                                          | 11.2.0   | BSD-2-Clause              |
| esquery                                                         | 1.7.0    | BSD-3-Clause              |
| esrecurse                                                       | 4.3.0    | BSD-2-Clause              |
| estraverse                                                      | 5.3.0    | BSD-2-Clause              |
| estree-walker                                                   | 3.0.3    | MIT                       |
| esutils                                                         | 2.0.3    | BSD-2-Clause              |
| exceljs                                                         | 4.4.0    | MIT                       |
| exceljs/node_modules/readable-stream                            | 3.6.2    | MIT                       |
| expect-type                                                     | 1.4.0    | Apache-2.0                |
| fast-csv                                                        | 4.3.6    | MIT                       |
| fast-deep-equal                                                 | 3.1.3    | MIT                       |
| fast-json-stable-stringify                                      | 2.1.0    | MIT                       |
| fast-levenshtein                                                | 2.0.6    | MIT                       |
| fdir                                                            | 6.5.0    | MIT                       |
| fflate                                                          | 0.8.3    | MIT                       |
| file-entry-cache                                                | 11.1.5   | MIT                       |
| find-up                                                         | 5.0.0    | MIT                       |
| flat-cache                                                      | 6.1.23   | MIT                       |
| flatted                                                         | 3.4.4    | ISC                       |
| for-each                                                        | 0.3.5    | MIT                       |
| fs-constants                                                    | 1.0.0    | MIT                       |
| fs.realpath                                                     | 1.0.0    | ISC                       |
| fsevents                                                        | 2.3.3    | MIT                       |
| fstream                                                         | 1.0.12   | ISC                       |
| function-bind                                                   | 1.1.2    | MIT                       |
| function.prototype.name                                         | 1.2.0    | MIT                       |
| functions-have-names                                            | 1.2.3    | MIT                       |
| generator-function                                              | 2.0.1    | MIT                       |
| get-intrinsic                                                   | 1.3.0    | MIT                       |
| get-proto                                                       | 1.0.1    | MIT                       |
| get-symbol-description                                          | 1.1.0    | MIT                       |
| glob                                                            | 7.2.3    | ISC                       |
| glob-parent                                                     | 6.0.2    | ISC                       |
| glob/node_modules/balanced-match                                | 1.0.2    | MIT                       |
| glob/node_modules/brace-expansion                               | 1.1.21   | MIT                       |
| glob/node_modules/minimatch                                     | 3.1.5    | ISC                       |
| globalthis                                                      | 1.0.4    | MIT                       |
| gopd                                                            | 1.2.0    | MIT                       |
| graceful-fs                                                     | 4.2.11   | ISC                       |
| has-bigints                                                     | 1.1.0    | MIT                       |
| has-property-descriptors                                        | 1.0.2    | MIT                       |
| has-proto                                                       | 1.2.0    | MIT                       |
| has-symbols                                                     | 1.1.0    | MIT                       |
| has-tostringtag                                                 | 1.0.2    | MIT                       |
| hash.js                                                         | 1.1.7    | MIT                       |
| hashery                                                         | 1.5.1    | MIT                       |
| hasown                                                          | 2.0.4    | MIT                       |
| hookified                                                       | 1.15.1   | MIT                       |
| https                                                           | 1.0.0    | ISC                       |
| ieee754                                                         | 1.2.1    | BSD-3-Clause              |
| ignore                                                          | 5.3.2    | MIT                       |
| image-size                                                      | 2.0.4    | MIT                       |
| imagetracerjs                                                   | 1.2.6    | Unlicense                 |
| immediate                                                       | 3.0.6    | MIT                       |
| imurmurhash                                                     | 0.1.4    | MIT                       |
| inflight                                                        | 1.0.6    | ISC                       |
| inherits                                                        | 2.0.4    | ISC                       |
| internal-slot                                                   | 1.1.0    | MIT                       |
| is-array-buffer                                                 | 3.0.5    | MIT                       |
| is-async-function                                               | 2.1.1    | MIT                       |
| is-bigint                                                       | 1.1.0    | MIT                       |
| is-boolean-object                                               | 1.2.2    | MIT                       |
| is-callable                                                     | 1.2.7    | MIT                       |
| is-data-view                                                    | 1.0.2    | MIT                       |
| is-date-object                                                  | 1.1.0    | MIT                       |
| is-document.all                                                 | 1.0.0    | MIT                       |
| is-extglob                                                      | 2.1.1    | MIT                       |
| is-finalizationregistry                                         | 1.1.1    | MIT                       |
| is-generator-function                                           | 1.1.2    | MIT                       |
| is-glob                                                         | 4.0.3    | MIT                       |
| is-map                                                          | 2.0.3    | MIT                       |
| is-negative-zero                                                | 2.0.3    | MIT                       |
| is-number-object                                                | 1.1.1    | MIT                       |
| is-regex                                                        | 1.2.1    | MIT                       |
| is-set                                                          | 2.0.3    | MIT                       |
| is-shared-array-buffer                                          | 1.0.4    | MIT                       |
| is-string                                                       | 1.1.1    | MIT                       |
| is-symbol                                                       | 1.1.1    | MIT                       |
| is-typed-array                                                  | 1.1.15   | MIT                       |
| is-weakmap                                                      | 2.0.2    | MIT                       |
| is-weakref                                                      | 1.1.1    | MIT                       |
| is-weakset                                                      | 2.0.4    | MIT                       |
| isarray                                                         | 1.0.0    | MIT                       |
| isexe                                                           | 2.0.0    | ISC                       |
| json-schema-traverse                                            | 0.4.1    | MIT                       |
| json-stable-stringify-without-jsonify                           | 1.0.1    | MIT                       |
| jszip                                                           | 3.10.2   | (MIT OR GPL-3.0-or-later) |
| keyv                                                            | 5.6.0    | MIT                       |
| lazystream                                                      | 1.0.1    | MIT                       |
| levn                                                            | 0.4.1    | MIT                       |
| lie                                                             | 3.3.0    | MIT                       |
| lightningcss                                                    | 1.33.0   | MPL-2.0                   |
| lightningcss-android-arm64                                      | 1.33.0   | MPL-2.0                   |
| lightningcss-darwin-arm64                                       | 1.33.0   | MPL-2.0                   |
| lightningcss-darwin-x64                                         | 1.33.0   | MPL-2.0                   |
| lightningcss-freebsd-x64                                        | 1.33.0   | MPL-2.0                   |
| lightningcss-linux-arm-gnueabihf                                | 1.33.0   | MPL-2.0                   |
| lightningcss-linux-arm64-gnu                                    | 1.33.0   | MPL-2.0                   |
| lightningcss-linux-arm64-musl                                   | 1.33.0   | MPL-2.0                   |
| lightningcss-linux-x64-gnu                                      | 1.33.0   | MPL-2.0                   |
| lightningcss-linux-x64-musl                                     | 1.33.0   | MPL-2.0                   |
| lightningcss-win32-arm64-msvc                                   | 1.33.0   | MPL-2.0                   |
| lightningcss-win32-x64-msvc                                     | 1.33.0   | MPL-2.0                   |
| listenercount                                                   | 1.0.1    | ISC                       |
| locate-path                                                     | 6.0.0    | MIT                       |
| lodash.defaults                                                 | 4.2.0    | MIT                       |
| lodash.difference                                               | 4.5.0    | MIT                       |
| lodash.escaperegexp                                             | 4.1.2    | MIT                       |
| lodash.flatten                                                  | 4.4.0    | MIT                       |
| lodash.groupby                                                  | 4.6.0    | MIT                       |
| lodash.isboolean                                                | 3.0.3    | MIT                       |
| lodash.isequal                                                  | 4.5.0    | MIT                       |
| lodash.isfunction                                               | 3.0.9    | MIT                       |
| lodash.isnil                                                    | 4.0.0    | MIT                       |
| lodash.isplainobject                                            | 4.0.6    | MIT                       |
| lodash.isundefined                                              | 3.0.1    | MIT                       |
| lodash.union                                                    | 4.6.0    | MIT                       |
| lodash.uniq                                                     | 4.5.0    | MIT                       |
| lop                                                             | 0.4.2    | BSD-2-Clause              |
| magic-string                                                    | 1.4.2    | MIT                       |
| mammoth                                                         | 1.13.0   | BSD-2-Clause              |
| mammoth/node_modules/@xmldom/xmldom                             | 0.8.15   | MIT                       |
| math-intrinsics                                                 | 1.1.0    | MIT                       |
| minimalistic-assert                                             | 1.0.1    | ISC                       |
| minimatch                                                       | 10.2.6   | BlueOak-1.0.0             |
| minimist                                                        | 1.2.8    | MIT                       |
| mkdirp                                                          | 0.5.6    | MIT                       |
| ms                                                              | 2.1.3    | MIT                       |
| nanoid                                                          | 3.3.19   | MIT                       |
| natural-compare                                                 | 1.4.0    | MIT                       |
| normalize-path                                                  | 3.0.0    | MIT                       |
| object-inspect                                                  | 1.13.4   | MIT                       |
| object-keys                                                     | 1.1.1    | MIT                       |
| object.assign                                                   | 4.1.7    | MIT                       |
| obug                                                            | 2.2.1    | MIT                       |
| once                                                            | 1.4.0    | ISC                       |
| option                                                          | 0.2.4    | BSD-2-Clause              |
| optionator                                                      | 0.9.4    | MIT                       |
| own-keys                                                        | 1.0.2    | MIT                       |
| p-limit                                                         | 3.1.0    | MIT                       |
| p-locate                                                        | 5.0.0    | MIT                       |
| pako                                                            | 1.0.11   | (MIT AND Zlib)            |
| path-exists                                                     | 4.0.0    | MIT                       |
| path-is-absolute                                                | 1.0.1    | MIT                       |
| path-key                                                        | 3.1.1    | MIT                       |
| pdf-lib                                                         | 1.17.1   | MIT                       |
| pdfjs-dist                                                      | 6.3.289  | Apache-2.0                |
| picocolors                                                      | 1.1.1    | ISC                       |
| picomatch                                                       | 4.0.7    | MIT                       |
| playwright                                                      | 1.63.0   | Apache-2.0                |
| playwright-core                                                 | 1.63.0   | Apache-2.0                |
| possible-typed-array-names                                      | 1.1.0    | MIT                       |
| postcss                                                         | 8.5.28   | MIT                       |
| pptxgenjs                                                       | 4.0.1    | MIT                       |
| pptxgenjs/node_modules/@types/node                              | 22.20.5  | MIT                       |
| pptxgenjs/node_modules/undici-types                             | 6.21.0   | MIT                       |
| preact                                                          | 10.29.8  | MIT                       |
| prelude-ls                                                      | 1.2.1    | MIT                       |
| prettier                                                        | 3.9.9    | MIT                       |
| process-nextick-args                                            | 2.0.1    | MIT                       |
| punycode                                                        | 2.3.1    | MIT                       |
| qified                                                          | 0.10.1   | MIT                       |
| qified/node_modules/hookified                                   | 2.2.0    | MIT                       |
| readable-stream                                                 | 2.3.8    | MIT                       |
| readdir-glob                                                    | 1.1.3    | Apache-2.0                |
| readdir-glob/node_modules/balanced-match                        | 1.0.2    | MIT                       |
| readdir-glob/node_modules/brace-expansion                       | 2.1.7    | MIT                       |
| readdir-glob/node_modules/minimatch                             | 5.1.9    | ISC                       |
| reflect.getprototypeof                                          | 1.0.10   | MIT                       |
| regexp.prototype.flags                                          | 1.5.4    | MIT                       |
| rimraf                                                          | 2.7.1    | ISC                       |
| rolldown                                                        | 1.2.11   | MIT                       |
| safe-array-concat                                               | 1.1.4    | MIT                       |
| safe-array-concat/node_modules/isarray                          | 2.0.5    | MIT                       |
| safe-buffer                                                     | 5.1.2    | MIT                       |
| safe-push-apply                                                 | 1.0.0    | MIT                       |
| safe-push-apply/node_modules/isarray                            | 2.0.5    | MIT                       |
| safe-regex-test                                                 | 1.1.0    | MIT                       |
| sax                                                             | 1.6.1    | BlueOak-1.0.0             |
| saxes                                                           | 5.0.1    | ISC                       |
| semver                                                          | 7.8.5    | ISC                       |
| set-function-length                                             | 1.2.2    | MIT                       |
| set-function-name                                               | 2.0.2    | MIT                       |
| set-proto                                                       | 1.0.0    | MIT                       |
| setimmediate                                                    | 1.0.5    | MIT                       |
| shebang-command                                                 | 2.0.0    | MIT                       |
| shebang-regex                                                   | 3.0.0    | MIT                       |
| side-channel                                                    | 1.1.1    | MIT                       |
| side-channel-list                                               | 1.0.1    | MIT                       |
| side-channel-map                                                | 1.0.1    | MIT                       |
| side-channel-weakmap                                            | 1.0.2    | MIT                       |
| source-map-js                                                   | 1.2.2    | BSD-3-Clause              |
| sprintf-js                                                      | 1.0.3    | BSD-3-Clause              |
| std-env                                                         | 4.2.0    | MIT                       |
| stop-iteration-iterator                                         | 1.1.0    | MIT                       |
| string_decoder                                                  | 1.1.1    | MIT                       |
| string.prototype.trim                                           | 1.2.11   | MIT                       |
| string.prototype.trimend                                        | 1.0.10   | MIT                       |
| string.prototype.trimstart                                      | 1.0.8    | MIT                       |
| tar-stream                                                      | 2.2.0    | MIT                       |
| tar-stream/node_modules/readable-stream                         | 3.6.2    | MIT                       |
| tinybench                                                       | 6.2.0    | MIT                       |
| tinyexec                                                        | 1.3.1    | MIT                       |
| tinyglobby                                                      | 0.2.17   | MIT                       |
| tmp                                                             | 0.2.7    | MIT                       |
| traverse                                                        | 0.3.10   | MIT                       |
| ts-api-utils                                                    | 2.5.0    | MIT                       |
| tslib                                                           | 1.14.1   | 0BSD                      |
| type-check                                                      | 0.4.0    | MIT                       |
| typed-array-buffer                                              | 1.0.3    | MIT                       |
| typed-array-byte-length                                         | 1.0.3    | MIT                       |
| typed-array-byte-offset                                         | 1.0.5    | MIT                       |
| typed-array-length                                              | 1.0.8    | MIT                       |
| typedarray.prototype.slice                                      | 1.0.6    | MIT                       |
| typescript                                                      | 6.0.3    | Apache-2.0                |
| typescript-eslint                                               | 8.71.0   | MIT                       |
| unbox-primitive                                                 | 1.1.0    | MIT                       |
| underscore                                                      | 1.13.8   | MIT                       |
| undici-types                                                    | 8.9.0    | MIT                       |
| unzipper                                                        | 0.10.14  | MIT                       |
| uri-js                                                          | 4.4.1    | BSD-2-Clause              |
| util-deprecate                                                  | 1.0.2    | MIT                       |
| uuid                                                            | 8.3.2    | MIT                       |
| vite                                                            | 8.3.1    | MIT                       |
| vitest                                                          | 5.0.2    | MIT                       |
| wasm-feature-detect                                             | 1.9.0    | Apache-2.0                |
| which                                                           | 2.0.2    | ISC                       |
| which-boxed-primitive                                           | 1.1.1    | MIT                       |
| which-builtin-type                                              | 1.2.1    | MIT                       |
| which-builtin-type/node_modules/isarray                         | 2.0.5    | MIT                       |
| which-collection                                                | 1.0.2    | MIT                       |
| which-typed-array                                               | 1.1.24   | MIT                       |
| why-is-node-running                                             | 3.2.2    | MIT                       |
| word-wrap                                                       | 1.2.5    | MIT                       |
| wrappy                                                          | 1.0.2    | ISC                       |
| xml                                                             | 1.0.1    | MIT                       |
| xml-js                                                          | 1.6.11   | MIT                       |
| xmlbuilder                                                      | 10.1.1   | MIT                       |
| xmlchars                                                        | 2.2.0    | MIT                       |
| yocto-queue                                                     | 0.1.0    | MIT                       |
| zip-stream                                                      | 4.1.1    | MIT                       |
| zip-stream/node_modules/archiver-utils                          | 3.0.4    | MIT                       |
| zip-stream/node_modules/readable-stream                         | 3.6.2    | MIT                       |

更新相依時需重新檢查授權、體積、安裝腳本、隱私行為與 audit，並更新此文件。
