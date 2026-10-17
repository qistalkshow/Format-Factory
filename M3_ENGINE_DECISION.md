# M3 引擎授權決策

查核日期：2026-10-15。使用者已同意官方 GPL 核心，採 @ffmpeg/ffmpeg 0.12.15 與 @ffmpeg/core 0.12.10。

## 方案與來源

- MIT 包裝層負責 Worker 通訊，GPL-2.0-or-later 單執行緒核心提供 H.264／AAC／MP3 處理。
- 純本機、自託管、按需載入。原有 MIT 通知保留，完整產品不描述為僅 MIT；GPL 全文及 codec/runtime 通知隨站提供。
- 核心不修改；wrapper 的 CORE_URL 只改為本站 URL，修改記錄在 scripts/prepare-media.mjs。
- public/media-licenses/source-manifest.json 收錄 19 份來源封裝的固定版本、commit、SHA-256，以及實際 ESM JS／WASM 雜湊。來源合計 108,701,982 B，個別檔案均小於 100 MiB，無需 Git LFS 或付費託管。
- 涵蓋所有 Dockerfile 連結的 codec、FFmpeg、修改後 fftools 與 bindings、Emscripten runtime、SDL2；各上游封裝保留授權檔，另整理 CODEC-NOTICES.txt。
- SDL2 2.24.2 以 Emscripten 3.1.40 ports 配方內 SHA-512 驗證。未包含不參與核心編譯／連結的測試用 submodule。
- 每次 build 以白名單產生 app-source.zip，包含應用程式、鎖檔、測試、建置腳本與 MIT 通知，不包含快取或使用者檔案。所有來源由同一網站的授權下載頁提供，不列入預快取。

## 已確認與推論界線

【已確認】官方 v12.15 包含 core 0.12.10／wrapper 0.12.15；實際核心回報 FFmpeg 5.1.4、Emscripten 3.1.40 與精確 compiler commit，編譯參數符合單執行緒 production 配方。來源檔均來自官方 repository，並記錄不可變 commit 與 SHA-256。x264 4-cores 與 LAME master 解析為 2022／2020 年 commit，早於 2025-01-07 發布。證據見 core-version.txt、Dockerfile.upstream 及 source-manifest.json。

【推論】上述發布配方、來源歷史及 binary 版本／參數支持這批來源對應該官方預編譯核心；這不是上游簽署的建置證明。本機沒有 Docker／Emscripten 工具鏈，沒有執行核心重建，也不聲稱逐位元一致。需要可重現建置保證時，應另建 Linux 工具鏈從這些固定來源重建並完整重驗。

## 發布閘門與維護

scripts/check-media-release.mjs 保留在 main 上傳 Pages 前。它不只讀取 verified：會比對來源清單 hash、19 個必要元件、每份封裝 hash、實際部署 JS／WASM hash、npm 版本，以及應用來源 ZIP 每個檔案與目前工作目錄一致。缺檔、版本更新或內容變動會失敗；需重新查核、建置與測試，不能只翻轉旗標。

本次沒有新增執行期相依。來源供應增加部署儲存量，但不增加正常轉檔流量。建置腳本只封裝與驗證，不連線下載。沒有宣稱已部署或建立遠端 repository。

## 官方依據

- [ffmpeg.wasm 授權 FAQ](https://ffmpegwasm.netlify.app/docs/faq/)
- [v12.15 核心版本](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/packages/core/package.json)
- [v12.15 建置配方](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/v12.15/Dockerfile)
- [FFmpeg 授權說明](https://www.ffmpeg.org/legal.html)
