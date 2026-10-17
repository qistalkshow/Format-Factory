# M1 驗證紀錄

驗證日期：2026-10-03。範圍限圖片模組，未進入 M2。

## 命令結果

| 命令              | 結果                                |
| ----------------- | ----------------------------------- |
| npm run lint      | 通過（ESLint 與 Prettier）          |
| npm run typecheck | 通過                                |
| npm run test      | 37 項通過                           |
| npm run build     | 通過，所有體積閘門通過              |
| npm run test:e2e  | 非零結束：16 通過、17 跳過、11 失敗 |
| npm audit         | 0 個已知漏洞                        |

Chromium 10 個真實功能案例通過；不適用的降級案例跳過。Windows WebKit 與手機 WebKit 各 3 個案例通過（SVG 光柵化、安全錯誤、缺少 Worker Canvas 時提示），各 8 個 Worker 轉換案例按能力跳過。跳過不代表轉換功能已驗證。Firefox 全部 11 個案例在瀏覽器啟動時失敗，Playwright 回報 spawn UNKNOWN；本機 Windows 並列設定問題尚未解除。CI 保留 Firefox，不忽略失敗。

已驗證檔頭、尺寸、透明背景、EXIF 八種方向、預設移除中繼資料、保留選項、SVG 可解析、ZIP 內容、保留原檔使舊 ZIP 失效、序列取消、外部請求為零、離線頁面／轉換與已快取 WASM 壓縮。離線測試關閉來源伺服器，不是假設頁面仍有網路。

以 Chromium 實際渲染並檢查 1280 px 與 390 px 寬度的完成結果及比較滑桿；兩者 scrollWidth 均等於 viewport 寬度。Safari／iOS 真機、Edge 與螢幕閱讀器未實測。

## 體積（Node zlib gzip，B）

| 產物                   | 原始大小 |   gzip |
| ---------------------- | -------: | -----: |
| 首屏 JS                |   24,063 | 10,344 |
| 首屏 CSS               |    4,531 |  1,716 |
| 圖片工作區 JS          |   25,290 | 10,289 |
| 圖片工作區 CSS         |    1,106 |    501 |
| 圖片 Worker            |    7,004 |  2,948 |
| imagetracer 引擎 chunk |   20,663 |  5,950 |
| JPEG 編碼 JS chunk     |   19,537 |  7,986 |
| PNG 編碼 JS chunk      |    2,643 |  1,211 |
| fflate chunk           |    8,883 |  4,463 |
| MozJPEG WASM           |  251,524 | 59,854 |
| Oxipng WASM            |  164,172 | 76,146 |

全部非 WASM 靜態預快取 gzip：54,804 B。首屏 JS / CSS 分別低於 81,920 / 15,360 B，非 WASM 總量低於 153,600 B。Vite 的 gzip 參數與 Node zlib 預設可能不同，以 `npm run build` 內的 size-check 為準。WASM 僅使用壓縮功能時請求；按需 chunk 的小型 JS 為離線可用而預快取，直到使用時才 import／執行。

## 新增相依

| 套件                  | 用途                | 授權                                    | npm .tgz gzip |
| --------------------- | ------------------- | --------------------------------------- | ------------: |
| @jsquash/jpeg 1.6.0   | MozJPEG 編碼        | Apache-2.0，codec 另含 IJG / BSD / Zlib |     157,933 B |
| @jsquash/oxipng 2.3.0 | 單執行緒 PNG 最佳化 | Apache-2.0，codec MIT                   |     192,200 B |
| imagetracerjs 1.2.6   | Worker 近似向量描摹 | Unlicense                               |   3,079,354 B |
| fflate 0.8.3          | Worker ZIP 打包     | MIT                                     |     173,034 B |

套件封裝含原始碼／範例等，不等於網站載入量；實際 chunk 見上表。全部本機執行、自託管，無遙測。完整清單與隨站授權通知見 THIRD_PARTY_LICENSES.md。

## 實測與限制

自製合成風景 JPEG，1600 × 1000，品質 75：979,376 B → 166,334 B，節省 83.0%。這是實際有效圖片的測量，不是實拍照片，也不代表所有圖片壓縮率。

- PNG 選擇 Oxipng 無損最佳化，滑桿調整努力程度；Canvas 的 8-bit sRGB 轉換與縮圖仍可能損失資訊。
- SVG 僅支援保守的自包含靜態子集；不支援濾鏡、引用、內嵌圖片或動畫。
- 中繼資料預設移除；選擇保留僅支援所列欄位，可能保留 GPS，不保證廠商欄位與原 ICC。
- 未曾下載的壓縮 WASM 無法憑空離線使用；一次成功載入後可離線重用。
- 完整跨瀏覽器驗收仍受上述 Windows 瀏覽器環境限制，不宣稱所有瀏覽器通過。

下一步建議為 M2 PDF 基礎操作；須待使用者確認，未開始實作。
