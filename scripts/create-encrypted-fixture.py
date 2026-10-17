# 測試專用：從自製 PDF 產生加密 fixture；密碼沒有任何真實資料。
from pathlib import Path
from pypdf import PdfReader, PdfWriter
root = Path(__file__).resolve().parent.parent
writer = PdfWriter(clone_from=PdfReader(root / 'tests/fixtures/pages.pdf'))
writer.encrypt('test-only', algorithm='RC4-128')
writer.write(root / 'tests/fixtures/encrypted.pdf')
