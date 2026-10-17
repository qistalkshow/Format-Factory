# M5 打磨與發布驗收

日期：2026-10-17。範圍：無障礙、效能、說明、隱私及 GitHub Pages 發布；不包含 M6。

## 變更與取捨

- 新增繁體中文／英文使用說明及完整隱私說明；說明靜態主機可能記錄一般資源存取，不宣稱託管商沒有 IP 紀錄。
- 鍵盤跳轉與模組焦點、控制項邊界對比、窄螢幕文字換行；保留系統 reduced-motion。
- 工具錯誤隔離、重試與清除復原；未成功啟動 JavaScript 時提供靜態說明。未新增框架或相依。
- 等待中的新版 Service Worker 顯示提示，避免強制更新造成工作遺失。
- 授權全文仍 self-host，但從首頁預快取移為點閱時快取。M4 首頁預快取為 128,564 B gzip，M5 明顯降低；首次離線且未點閱時不保證授權頁可開啟。
- CI 保留 main 自動部署與正確的儲存庫 base path；所有建置皆檢查來源對應，失敗 trace 保存 7 天。

## 驗證

正式 `BASE_PATH=/Format-Factory/` 建置已驗證：

| 檢查              | 結果                                          |
| ----------------- | --------------------------------------------- |
| npm run lint      | 通過                                          |
| npm run typecheck | 通過                                          |
| npm run test      | 59 項通過／8 個檔案                           |
| npm run build     | 通過，含體積閘門                              |
| npm run test:e2e  | 88 項通過、36 項能力／互斥案例跳過、0 失敗    |
| M5 專屬案例       | 16 項通過，含更新不遺失工作、鍵盤、對比與復原 |
| 發布來源一致性    | 核心雜湊、19 份對應來源與應用來源 ZIP 通過    |
| npm audit         | 5 moderate，0 high／critical                  |

首屏 JS gzip 15,034 B、CSS 1,792 B，首頁預快取合計 58,454 B；相較 M4 的 128,564 B 減少約 54.5%。沒有新增相依。模組、WASM 仍按需載入。

已視覺檢查 390 px 手機首頁、使用說明與淺色隱私頁。自動測試涵蓋 320 px、文字對比 ≥ 4.5:1、控制項邊界 ≥ 3:1 與減少動效；這些檢查不等於完整 WCAG 認證。Firefox 使用既有官方獨立副本；CI 使用預設 Playwright 瀏覽器。

本機 Edge 補驗 M4／M5：9 項通過、1 項降級案例跳過，程序正常退出。首次 Linux CI 發現影音測試依賴既有 `.cache` 資料夾；已改用 Playwright 附件保存壓縮數據，避免乾淨 checkout 與平行測試順序影響結果。第一次失敗的發布沒有上線。

## 發布狀態

使用者指定儲存庫：https://github.com/qistalkshow/Format-Factory 。初始遠端為空，GitHub 認證與管理權限已確認；本機可發布版本驗收完成。

正式網址：https://qistalkshow.github.io/Format-Factory/ 。每次推送 main 由 [GitHub Actions](https://github.com/qistalkshow/Format-Factory/actions) 驗證並發布；應以該次執行的 deploy 結果及網站實際載入確認上線，不把本機測試當作雲端成功。

## 限制

- npm audit 仍有 5 moderate、0 high／critical，詳見 THIRD_PARTY_LICENSES.md；沒有以強制降版掩蓋通報。
- Office → PDF 的圖片式簡化排版、M1–M4 格式與資源限制不變。
- Playwright WebKit 不等同 Safari／iOS 真機；螢幕閱讀器與實機觸控仍需人工驗收。
- 不宣稱完整 WCAG 認證，也不保證所有裝置的記憶體容量或離線快取永久保留。

## 維護與回復

正式發布須先完成 GitHub 認證，將 Pages 發布來源設為 GitHub Actions，再推送 main。CI 必須全部通過才部署。需要回復時 revert 問題提交並由相同工作流程重建，不直接修改產物；保留既有 GPL 核心對應來源。新版啟用前先下載工作結果。
