export const officeZh = {
  docx: '轉為 DOCX（可編輯文字）',
  xlsx: '轉為 XLSX（表格／文字）',
  'from-docx': 'DOCX → PDF（簡化排版）',
  'from-xlsx': 'XLSX → PDF（儲存格排版）',
  'from-pptx': 'PPTX → PDF（簡單版型）',
  officeTier: 'Tier 2 · 盡力轉換，版面可能略有差異',
  officeExport:
    '依文字座標重建段落、標題與對齊表格；多欄閱讀順序可能不同。DOCX 點陣圖片置於各頁文字之後，向量圖形不保留；XLSX 每頁一個工作表，無表格時保留文字。掃描文件不做 OCR；無文字時無法輸出 XLSX。',
  officeImport:
    '以系統字型重排為頁面圖片 PDF，文字不可搜尋／選取，原字型與精確版面不保留。DOCX 支援段落、標題、簡單表格與 PNG/JPEG；XLSX 使用公式快取值，不重新計算，寬表分欄帶；PPTX 僅簡單文字、圖片及表格。圖表、SmartArt、群組及複雜物件可能拒絕轉換，請改用原應用程式匯出。',
  officeLimits:
    'Office 安全上限：單檔 32 MiB、解壓後 64 MiB、最多 100 頁／20,000 個儲存格。不接受巨集、內嵌物件、外部圖片或加密 Office。',
  officeAcknowledge: '我了解 Tier 2 的版面與內容限制',
  docxDownload: '下載 DOCX',
  xlsxDownload: '下載 XLSX',
};
export const officeEn: typeof officeZh = {
  docx: 'Convert to DOCX (editable text)',
  xlsx: 'Convert to XLSX (tables / text)',
  'from-docx': 'DOCX → PDF (simplified layout)',
  'from-xlsx': 'XLSX → PDF (cell layout)',
  'from-pptx': 'PPTX → PDF (simple slides)',
  officeTier: 'Tier 2 · Best effort; layout may differ',
  officeExport:
    'Rebuild paragraphs, headings and aligned tables from text positions; multi-column reading order may differ. DOCX raster images follow each page’s text; vector artwork is not retained. XLSX uses one sheet per page, with text when no table is found. No OCR: image-only PDFs cannot produce XLSX.',
  officeImport:
    'System-font layout exported as page-image PDF: text is not searchable or selectable, and original fonts / exact layout are lost. DOCX supports paragraphs, headings, simple tables and PNG/JPEG. XLSX uses cached formula results without recalculation; wide tables split into column bands. PPTX supports simple text, images and tables. Charts, SmartArt, groups and complex objects may be rejected; export from the original application instead.',
  officeLimits:
    'Office limits: 32 MiB input, 64 MiB expanded, 100 pages / 20,000 cells. Macros, embedded objects, external images and encrypted Office files are rejected.',
  officeAcknowledge: 'I understand the Tier 2 layout and content limitations',
  docxDownload: 'Download DOCX',
  xlsxDownload: 'Download XLSX',
};
export const officeErrorsZh = {
  officeLimit: '文件超過 Office 安全上限。請減少頁面、儲存格或圖片後重試。',
  unsafeOffice:
    '文件包含巨集、內嵌物件或不安全結構。請從原應用程式另存為不含這些內容的副本。',
  externalOffice:
    '文件含外部連結圖片或資料，為避免連線已停止。請先在原應用程式將內容內嵌後再匯出。',
  officeEncrypted:
    '不支援加密 Office 或舊版二進位文件，請先另存為未加密的 DOCX／XLSX／PPTX。',
  officeUnsupported:
    '文件包含無法可靠排版的圖片、物件或文字框。請簡化內容，或用原應用程式匯出 PDF。',
  officeFormula:
    '公式缺少已計算的結果。請在試算表應用程式重新計算並儲存後再試；本工具不執行公式。',
  noOfficeContent:
    '找不到可輸出的內容。掃描 PDF 請先另行做 OCR；本工具不會假造文字。',
  officeMixed: '每批請使用相同格式：PDF、DOCX、XLSX 或 PPTX，勿混合。',
};
export const officeErrorsEn: typeof officeErrorsZh = {
  officeLimit:
    'Office safety limit exceeded. Reduce pages, cells or image sizes.',
  unsafeOffice:
    'Macros, embedded objects or unsafe structures detected. Save a copy without these contents.',
  externalOffice:
    'External images or data detected. Processing stopped to prevent network access. Embed the content in the original application first.',
  officeEncrypted:
    'Encrypted Office and legacy binary documents are unsupported. Save an unencrypted DOCX / XLSX / PPTX copy.',
  officeUnsupported:
    'An image, object or text box cannot be reliably laid out. Simplify the document or export PDF from the original application.',
  officeFormula:
    'A formula has no cached result. Recalculate and save in a spreadsheet application first. This tool does not execute formulas.',
  noOfficeContent:
    'No exportable content found. Image-only PDFs need separate OCR; this tool does not invent text.',
  officeMixed:
    'Use one format per batch: PDF, DOCX, XLSX or PPTX. Do not mix formats.',
};
