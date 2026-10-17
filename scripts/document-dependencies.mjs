import { readFile, writeFile, readdir } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const packs = JSON.parse(
  await readFile('scripts/dependency-sizes.json', 'utf8'),
);
const purposes = {
  numfmt: 'Worker 中依 Excel 數字格式顯示百分比、金額、日期與公式快取值',
  docx: 'Worker 中建立可編輯 DOCX',
  exceljs: 'Worker 中讀寫 XLSX 與公式快取值',
  mammoth: 'Worker 中將 DOCX 轉為簡化 HTML，禁止外部檔案',
  '@xmldom/xmldom': 'Worker 中解析 OOXML 與隔離的 HTML，不插入頁面 DOM',
  preact: '元件、Hooks、JSX runtime',
  '@jsquash/jpeg': 'Worker 中的 MozJPEG WASM 編碼',
  '@jsquash/oxipng': 'Worker 中的單執行緒 PNG 無損最佳化',
  imagetracerjs: 'Worker 中的近似向量描摹',
  fflate: 'Worker 中打包 ZIP',
  'pdf-lib': 'Worker 中保留原頁面合併／分割與建立影像 PDF',
  'pdfjs-dist': 'Worker 中解析 PDF、密碼處理與頁面渲染',
  pptxgenjs: 'Worker 中建立每頁圖片版 PPTX',
  '@ffmpeg/ffmpeg': '影音 Worker 通訊與核心載入（MIT 包裝層）',
  '@ffmpeg/core': '單執行緒影音解碼、編碼與壓縮（GPL 核心）',
  vite: '開發伺服器與產物切割／建置',
  typescript: 'strict 型別檢查',
  vitest: '核心與 Worker 邊界單元測試',
  eslint: '程式碼靜態檢查',
  '@eslint/js': 'ESLint 官方 JavaScript 規則',
  'typescript-eslint': 'TypeScript ESLint parser／規則整合',
  prettier: '格式化與格式檢查',
  '@playwright/test': 'E2E、瀏覽器自動化及隱私檢查',
  '@types/node': '建置與測試工具 Node.js 型別',
};
const rows = packs.map((pack) => {
  const entry = lock.packages[`node_modules/${pack.name}`];
  if (!entry || entry.version !== pack.version)
    throw new Error(`Version mismatch: ${pack.name}`);
  return `| ${pack.name} | ${pack.version} | ${entry.license} | ${pack.size.toLocaleString('en-US')} B | ${purposes[pack.name]} |`;
});
const transitive = Object.entries(lock.packages)
  .filter(([path]) => path)
  .map(
    ([path, entry]) =>
      `| ${path.replace(/^node_modules\//, '')} | ${entry.version} | ${entry.license ?? '查閱套件授權檔'} |`,
  );
const content = `# 第三方相依與授權

原有專案程式碼保留 MIT；M3 經使用者同意加入 GPL 核心，不能將完整含核心產品描述為僅 MIT。以下版本由 package-lock.json 固定。查核日期：2026-10-17。

## 直接相依

gzip 封裝體積由 npm 官方 registry 的 npm pack 套件@版本 --dry-run --json 所回傳 size 取得，表示 .tgz 的壓縮大小，**不是瀏覽器 bundle 大小**，也不包含間接相依。開發相依全部只於本機／CI 執行，正式網站傳輸貢獻為 0 B。

| 套件 | 版本 | 授權 | npm gzip 封裝大小 | 用途 |
| --- | --- | --- | ---: | --- |
${rows.join('\n')}

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

| 套件路徑 | 版本 | SPDX 授權 |
| --- | --- | --- |
${transitive.join('\n')}

更新相依時需重新檢查授權、體積、安裝腳本、隱私行為與 audit，並更新此文件。
`;
await writeFile('THIRD_PARTY_LICENSES.md', content);
const notices = [
  'This software is based in part on the work of the Independent JPEG Group.',
];
for (const [name, version] of Object.entries(manifest.dependencies)) {
  if (name.startsWith('@ffmpeg/')) {
    notices.push(
      `${name} ${version}\n\n${await readFile(name === '@ffmpeg/core' ? 'public/media-licenses/GPL-2.0.txt' : 'public/media-licenses/WRAPPER-MIT.txt', 'utf8')}`,
    );
    continue;
  }
  notices.push(
    `${name} ${version}\n\n${await readFile(`node_modules/${name}/${name === 'pdf-lib' ? 'LICENSE.md' : 'LICENSE'}`, 'utf8')}`,
  );
  if (name.startsWith('@jsquash/'))
    notices.push(
      await readFile(`node_modules/${name}/codec/LICENSE.codec.md`, 'utf8'),
    );
}
for (const path of [
  'jszip/LICENSE.markdown',
  'pako/LICENSE',
  '@pdf-lib/standard-fonts/LICENSE.md',
  '@pdf-lib/upng/LICENSE',
  'tslib/LICENSE.txt',
  'lie/license.md',
  'immediate/LICENSE.txt',
  'setimmediate/LICENSE.txt',
  'readable-stream/LICENSE',
  'safe-buffer/LICENSE',
  'string_decoder/LICENSE',
  'inherits/LICENSE',
  'util-deprecate/LICENSE',
])
  notices.push(`${path}\n\n${await readFile(`node_modules/${path}`, 'utf8')}`);
notices.push(
  `Liberation Sans 2.1.5 (OFL-1.1)\n\n${await readFile('vendor/liberation-sans/LICENSE', 'utf8')}`,
);
for (const dir of ['cmaps', 'wasm', 'iccs', 'standard_fonts'])
  for (const name of await readdir(`public/pdf-engine/${dir}`))
    if (name.startsWith('LICENSE'))
      notices.push(
        `PDF.js ${dir}/${name}\n\n${await readFile(`public/pdf-engine/${dir}/${name}`, 'utf8')}`,
      );
// 另保留 M4 間接相依通知；包含開發機可能安裝、但網站不會執行的 Node 路徑。
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev) continue;
  const names = await readdir(path).catch(() => []);
  for (const name of names.filter((n) =>
    /^(?:licen[sc]e|copying|notice)(?:\.|$)/i.test(n),
  )) {
    const text = await readFile(path + '/' + name, 'utf8').catch(() => '');
    if (text) notices.push(path + '/' + name + '\n\n' + text);
  }
}
await writeFile('public/THIRD_PARTY_NOTICES.txt', notices.join('\n\n'));
