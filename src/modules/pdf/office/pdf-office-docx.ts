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
  type ISectionOptions,
} from 'docx';
import { openPdf, renderPage } from '../pdf-renderer';
import { docxRuns, pageGeometry } from './docx-format';
import { pageText, pageImages, guardDocument } from './pdf-office-extract';
import { blocksFromLines, OFFICE_LIMITS } from './model';
export async function pdfDocx(
  file: Blob,
  password: string,
  progress: (p: number) => void,
  mode: 'editable' | 'appearance' = 'editable',
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
    const sections: ISectionOptions[] = [];
    let textBytes = 0,
      imageBytes = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const view = page.getViewport({ scale: 1 });
      const children: (Paragraph | Table)[] = [];
      if (mode === 'appearance') {
        const { properties } = pageGeometry(view.width, view.height, []);
        const scale = Math.min(
          2,
          8192 / view.width,
          8192 / view.height,
          Math.sqrt(12_000_000 / (view.width * view.height)),
        );
        const rendered = await renderPage(page, scale, 1, 'image/png');
        imageBytes += rendered.blob.size;
        if (imageBytes > OFFICE_LIMITS.expanded) throw new Error('officeLimit');
        children.push(
          new Paragraph({
            spacing: { before: 0, after: 0, line: 20 },
            children: [
              new ImageRun({
                type: 'png',
                data: new Uint8Array(await rendered.blob.arrayBuffer()),
                transformation: {
                  width: (view.width * 4) / 3,
                  height: (view.height * 4) / 3,
                },
                floating: {
                  horizontalPosition: { relative: 'page', offset: 0 },
                  verticalPosition: { relative: 'page', offset: 0 },
                  behindDocument: true,
                  allowOverlap: true,
                },
              }),
            ],
          }),
        );
        sections.push({ properties, children });
        progress(0.1 + (n / doc.numPages) * 0.75);
        continue;
      }
      const lines = await pageText(page, OPS);
      const geometry = pageGeometry(view.width, view.height, lines);
      textBytes += lines.reduce(
        (n, line) =>
          n + line.cells.reduce((m, cell) => m + cell.text.length, 0),
        0,
      );
      if (textBytes > OFFICE_LIMITS.text) throw new Error('officeLimit');
      const median =
        [...lines.map((l) => l.size)].sort((a, b) => a - b)[
          Math.floor(lines.length / 2)
        ] ?? 12;
      let lineIndex = 0;
      let cursor = geometry.top;
      for (const block of blocksFromLines(lines)) {
        const line = lines[lineIndex];
        const before = Math.max(0, line.y - line.size - cursor);
        if (block.kind === 'text')
          children.push(
            new Paragraph({
              tabStops: line.cells.slice(1).map((cell) => ({
                type: 'left',
                position: Math.round((cell.x - line.cells[0].x) * 20),
              })),
              indent: {
                left: Math.round(
                  Math.max(
                    0,
                    (lines[lineIndex]?.cells[0]?.x ?? 0) - geometry.left,
                  ) * 20,
                ),
              },
              spacing: {
                before: Math.round(before * 20),
                after: 0,
                line: Math.round(line.size * 1.2 * 20),
                lineRule: 'atLeast',
              },
              heading:
                (block.size ?? 12) > median * 1.35
                  ? HeadingLevel.HEADING_1
                  : undefined,
              children: docxRuns(lines[lineIndex].cells, lines[lineIndex].y),
            }),
          );
        if (block.kind === 'table')
          children.push(
            new Table({
              rows: block.rows.map(
                (row, rowIndex) =>
                  new TableRow({
                    children: row.map(
                      (text, col) =>
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: lines[lineIndex + rowIndex]?.cells[col]
                                ? docxRuns(
                                    [lines[lineIndex + rowIndex].cells[col]],
                                    lines[lineIndex + rowIndex].y,
                                  )
                                : [new TextRun(text)],
                            }),
                          ],
                        }),
                    ),
                  }),
              ),
            }),
          );
        lineIndex += block.kind === 'table' ? block.rows.length : 1;
        const lastLine = lines[lineIndex - 1];
        cursor = lastLine.y + lastLine.size * 0.2;
      }
      // 一般未旋轉圖片保留頁面座標；剪裁、遮罩與旋轉請選保留外觀模式。
      const images: ImageRun[] = [];
      for (const image of await pageImages(page, OPS)) {
        const { bytes } = image;
        imageBytes += bytes.length;
        if (imageBytes > OFFICE_LIMITS.expanded) throw new Error('officeLimit');
        images.push(
          new ImageRun({
            type: 'png',
            data: bytes,
            transformation: {
              width: (image.width * 4) / 3,
              height: (image.height * 4) / 3,
            },
            floating: {
              horizontalPosition: {
                relative: 'page',
                offset: Math.round(image.x * 12700),
              },
              verticalPosition: {
                relative: 'page',
                offset: Math.round(image.y * 12700),
              },
              allowOverlap: true,
              lockAnchor: true,
              layoutInCell: false,
            },
          }),
        );
      }
      if (images.length) {
        // Word 的圖片永遠與錨點同頁；不可把錨點放在可能溢頁的正文末尾。
        // 專用頁首段落只佔 1 twip，不隨後方正文重排，也不與標題綁定換頁。
        children.unshift(
          new Paragraph({
            spacing: { before: 0, after: 0, line: 1, lineRule: 'exact' },
            keepNext: false,
            keepLines: false,
            widowControl: false,
            children: images,
          }),
        );
      }
      page.cleanup();
      sections.push({ properties: geometry.properties, children });
      progress(0.1 + (n / doc.numPages) * 0.75);
    }
    if (!sections.length) throw new Error('noOfficeContent');
    return Packer.toBlob(new Document({ creator: 'FormatFactory', sections }));
  } finally {
    await close();
  }
}
