import mammoth from 'mammoth';
import { zipSync } from 'fflate';
import { type Element } from '@xmldom/xmldom';
import { openOffice, xml, childElements, elements } from './archive';
import { OFFICE_LIMITS, type Block } from './model';
import { flowPdf } from './pdf-office-layout';
export async function docxPdf(file: Blob, progress: (p: number) => void) {
  const archive = await openOffice(file, 'docx');
  if (
    Object.keys(archive).some(
      (path) =>
        !path.endsWith('/') && /^word\/(?:charts|diagrams)\//.test(path),
    )
  )
    throw new Error('officeUnsupported');
  progress(0.1);
  const images: Block[] = [];
  const converted = await mammoth.convertToHtml(
    { arrayBuffer: new Uint8Array(zipSync(archive)).buffer },
    {
      includeEmbeddedStyleMap: false,
      externalFileAccess: false,
      convertImage: mammoth.images.imgElement(async (image) => {
        if (
          !['image/png', 'image/jpeg'].includes(image.contentType) ||
          images.length >= 100
        )
          throw new Error('officeUnsupported');
        images.push({
          kind: 'image',
          bytes: new Uint8Array(await image.readAsArrayBuffer()),
          mime: image.contentType,
        });
        return { src: `local-image-${images.length - 1}` };
      }),
    },
  );
  if (
    converted.messages.some(
      (m) =>
        m.type === 'error' ||
        /unrecognised element|unsupported content/i.test(m.message),
    )
  )
    throw new Error('officeUnsupported');
  // Mammoth HTML 不送入瀏覽器 DOM。只在 Worker 解析白名單內容，連結與腳本無執行機會。
  const document = xml(`<html><body>${converted.value}</body></html>`, true),
    body = elements(document, 'body')[0];
  if (!body) throw new Error('corrupt');
  const blocks: Block[] = [];
  let length = 0;
  function walk(element: Element, depth = 0) {
    if (depth > 64) throw new Error('officeLimit');
    const tag = element.localName?.toLowerCase();
    if (tag === 'img') {
      const id = element.getAttribute('src')?.match(/^local-image-(\d+)$/);
      if (!id || !images[Number(id[1])]) throw new Error('unsafeOffice');
      blocks.push(images[Number(id[1])]);
      return;
    }
    if (tag === 'table') {
      if (
        elements(element, 'td').some(
          (cell) =>
            Number(cell.getAttribute('rowspan') ?? 1) > 1 ||
            Number(cell.getAttribute('colspan') ?? 1) > 1,
        )
      )
        throw new Error('officeUnsupported');
      const rows = elements(element, 'tr').map((tr) =>
        childElements(tr)
          .filter((c) => ['td', 'th'].includes(c.localName ?? ''))
          .map((c) => c.textContent ?? ''),
      );
      blocks.push({ kind: 'table', rows });
      for (const img of elements(element, 'img')) walk(img, depth + 1);
      return;
    }
    if (tag && /^(?:p|h[1-6]|li|blockquote|pre)$/.test(tag)) {
      const text = element.textContent ?? '';
      length += text.length;
      if (length > OFFICE_LIMITS.text) throw new Error('officeLimit');
      if (text.trim())
        blocks.push({
          kind: 'text',
          text: (tag === 'li' ? '• ' : '') + text,
          size: tag.startsWith('h')
            ? Math.max(14, 26 - Number(tag[1]) * 2)
            : 12,
          bold: tag.startsWith('h'),
        });
      for (const img of elements(element, 'img')) walk(img, depth + 1);
      return;
    }
    if (tag && ['script', 'style', 'iframe', 'object'].includes(tag))
      throw new Error('unsafeOffice');
    for (const child of childElements(element)) walk(child, depth + 1);
  }
  walk(body);
  progress(0.3);
  return flowPdf(blocks, progress);
}
