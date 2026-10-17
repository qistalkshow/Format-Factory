export const officeZh = {
  docx: '轉為 DOCX（Word）',
  docxMode: 'Word 版面模式',
  docxEditable: '可編輯文字（推定排版）',
  docxAppearance: '保留頁面外觀（整頁圖片，文字不可編輯）',
  docxModeHint:
    '需要維持圖片、底線與上下標外觀時，選保留頁面外觀。此模式按原頁尺寸嵌入圖片，不能直接編輯或搜尋文字，檔案可能較大。',
  xlsx: '轉為 XLSX（表格／文字）',
  'from-docx': 'DOCX → PDF（簡化排版）',
  'from-xlsx': 'XLSX → PDF（儲存格排版）',
  'from-pptx': 'PPTX → PDF（簡單版型）',
  officeTier: 'Tier 2 · 盡力轉換，版面可能略有差異',
  officeExport:
    'DOCX 可編輯模式保留頁面尺寸、可辨識的粗斜體與字級、推定上下標、簡單底線及文字邊界，一般點陣圖片依頁面位置放置。字型替代、多欄、複雜底線、向量、旋轉與剪裁可能不同；需要維持外觀請選整頁圖片模式。XLSX 僅重建表格／文字，不保留原版面。掃描文件不做 OCR；無文字時無法輸出 XLSX。',
  officeImport:
    '以系統字型重排為頁面圖片 PDF，文字不可搜尋／選取，原字型與精確版面不保留。DOCX 保留一致分節的紙張／邊界，以及段落、簡單表格內的粗斜體、底線與上下標；不同分節尺寸會拒絕轉換。支援 PNG/JPEG；XLSX 保留儲存格的基本粗斜體、底線及上下標， 使用公式快取值，不重新計算，寬表分欄帶；PPTX 僅簡單文字、圖片及表格。圖表、SmartArt、群組及複雜物件可能拒絕轉換，請改用原應用程式匯出。',
  officeLimits:
    'Office 安全上限：單檔 32 MiB、解壓後 64 MiB、最多 100 頁／20,000 個儲存格。不接受巨集、內嵌物件、外部圖片或加密 Office。',
  officeAcknowledge: '我了解 Tier 2 的版面與內容限制',
  docxDownload: '下載 DOCX',
  xlsxDownload: '下載 XLSX',
};
export const officeEn: typeof officeZh = {
  docx: 'Convert to DOCX (Word)',
  docxMode: 'Word layout mode',
  docxEditable: 'Editable text (inferred layout)',
  docxAppearance: 'Preserve page appearance (page images, not editable)',
  docxModeHint:
    'Choose page appearance to retain images, underlines and superscript/subscript appearance. Pages use their original dimensions, but text cannot be edited or searched and files may be larger.',
  xlsx: 'Convert to XLSX (tables / text)',
  'from-docx': 'DOCX → PDF (simplified layout)',
  'from-xlsx': 'XLSX → PDF (cell layout)',
  'from-pptx': 'PPTX → PDF (simple slides)',
  officeTier: 'Tier 2 · Best effort; layout may differ',
  officeExport:
    'Editable DOCX retains page dimensions, identifiable bold/italic styles and sizes, inferred baseline shifts, simple underlines and text margins, and positions ordinary raster images on the page. Font substitution, columns, complex underlines, vectors, rotation and clipping may differ: choose page images to preserve appearance. XLSX reconstructs tables/text, not original formatting. No OCR: image-only PDFs cannot produce XLSX.',
  officeImport:
    'System-font layout exported as page-image PDF: text is not searchable or selectable, and original fonts / exact layout are lost. DOCX retains uniform section page sizes/margins and basic bold/italic, underline and script formatting in paragraphs/tables; differing section sizes are rejected. PNG/JPEG supported. XLSX retains basic cell emphasis and script formatting and uses cached formula results without recalculation; wide tables split into column bands. PPTX supports simple text, images and tables. Charts, SmartArt, groups and complex objects may be rejected; export from the original application instead.',
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
