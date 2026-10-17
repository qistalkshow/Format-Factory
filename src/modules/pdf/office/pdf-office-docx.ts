import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  HeadingLevel,
} from 'docx';
import { openPdf } from '../pdf-renderer';
import { pageText, pageImages, guardDocument } from './pdf-office-extract';
import { blocksFromLines, OFFICE_LIMITS } from './model';
export async function pdfDocx(
  file: Blob,
  password: string,
  progress: (p: number) => void,
) {
  const { doc, close } = await openPdf(file, password);
  try {
    guardDocument(doc);
    const root = new URL(
      `${import.meta.env.BASE_URL}pdf-engine/pdf.mjs`,
      self.location.origin,
    ).href;
    const { OPS }: typeof import('pdfjs-dist') = await import(
      /* @vite-ignore */ root
    );
    const children: (Paragraph | Table)[] = [];
    let textBytes = 0,
      imageBytes = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n),
        lines = await pageText(page);
      textBytes += lines.reduce(
        (n, line) =>
          n + line.cells.reduce((m, cell) => m + cell.text.length, 0),
        0,
      );
      if (textBytes > OFFICE_LIMITS.text) throw new Error('officeLimit');
      if (n > 1) children.push(new Paragraph({ pageBreakBefore: true }));
      const median =
        [...lines.map((l) => l.size)].sort((a, b) => a - b)[
          Math.floor(lines.length / 2)
        ] ?? 12;
      for (const block of blocksFromLines(lines)) {
        if (block.kind === 'text')
          children.push(
            new Paragraph({
              heading:
                (block.size ?? 12) > median * 1.35
                  ? HeadingLevel.HEADING_1
                  : undefined,
              children: [
                new TextRun({
                  text: block.text,
                  bold: block.bold,
                  size: Math.round(
                    Math.max(8, Math.min(36, block.size ?? 12)) * 2,
                  ),
                }),
              ],
            }),
          );
        if (block.kind === 'table')
          children.push(
            new Table({
              rows: block.rows.map(
                (row) =>
                  new TableRow({
                    children: row.map(
                      (text) =>
                        new TableCell({ children: [new Paragraph(text)] }),
                    ),
                  }),
              ),
            }),
          );
      }
      // 圖片獨立保存於該頁文字之後；不宣稱重建浮動位置或複雜環繞。
      for (const bytes of await pageImages(page, OPS)) {
        imageBytes += bytes.length;
        if (imageBytes > OFFICE_LIMITS.expanded) throw new Error('officeLimit');
        const bitmap = await createImageBitmap(
          new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
        );
        const scale = Math.min(1, 600 / bitmap.width, 780 / bitmap.height),
          width = Math.round(bitmap.width * scale),
          height = Math.round(bitmap.height * scale);
        bitmap.close();
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                type: 'png',
                data: bytes,
                transformation: { width, height },
              }),
            ],
          }),
        );
      }
      page.cleanup();
      progress(0.1 + (n / doc.numPages) * 0.75);
    }
    if (!children.length) throw new Error('noOfficeContent');
    return Packer.toBlob(
      new Document({ creator: 'FormatFactory', sections: [{ children }] }),
    );
  } finally {
    await close();
  }
}
