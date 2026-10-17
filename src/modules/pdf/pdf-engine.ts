import { PDFDocument } from 'pdf-lib';
import { PDF_LIMITS, parsePdfOptions, splitGroups, pdfPreset } from './options';
import type { PdfRequest, PdfResult } from './protocol';
async function load(file: Blob) {
  try {
    const doc = await PDFDocument.load(await file.arrayBuffer(), {
      updateMetadata: false,
    });
    doc.getPageCount();
    return doc;
  } catch (error) {
    throw new Error(
      error instanceof Error && /encrypt/i.test(error.message)
        ? 'encrypted'
        : 'corrupt',
      { cause: error },
    );
  }
}
const pdfBlob = (bytes: Uint8Array) =>
  new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
function countCheck(count: number) {
  if (count < 1 || count > PDF_LIMITS.pages) throw new Error('limit');
}
export async function processPdf(
  request: PdfRequest,
  progress: (p: number) => void,
): Promise<PdfResult> {
  const { files, action } = request,
    options = parsePdfOptions(request.options);
  if (
    !files.length ||
    files.length > 20 ||
    files.reduce((n, f) => n + f.size, 0) > PDF_LIMITS.batch ||
    files.some((f) => f.size > PDF_LIMITS.bytes)
  )
    throw new Error('limit');
  if (
    ['docx', 'xlsx', 'from-docx', 'from-xlsx', 'from-pptx'].includes(action)
  ) {
    const { processOffice } = await import('./office/pdf-office-engine');
    return processOffice(
      action as import('./office/pdf-office-engine').OfficeOperation,
      files,
      options,
      progress,
    );
  }
  if (action !== 'merge' && files.length !== 1) throw new Error('options');
  for (const file of files)
    if (
      !new TextDecoder()
        .decode(await file.slice(0, 1024).arrayBuffer())
        .includes('%PDF-')
    )
      throw new Error('corrupt');
  progress(0.05);
  let result: PdfResult;
  if (action === 'merge') {
    const output = await PDFDocument.create();
    let count = 0;
    for (const [index, file] of files.entries()) {
      const source = await load(file);
      count += source.getPageCount();
      countCheck(count);
      for (const page of await output.copyPages(
        source,
        source.getPageIndices(),
      ))
        output.addPage(page);
      progress(0.1 + ((index + 1) / files.length) * 0.75);
    }
    result = { blobs: [pdfBlob(await output.save())] };
  } else if (action === 'split') {
    const source = await load(files[0]);
    countCheck(source.getPageCount());
    const groups = splitGroups(options, source.getPageCount());
    const blobs: Blob[] = [];
    let total = 0;
    for (const [i, group] of groups.entries()) {
      const output = await PDFDocument.create();
      for (const page of await output.copyPages(
        source,
        group.map((p) => p - 1),
      ))
        output.addPage(page);
      const blob = pdfBlob(await output.save());
      total += blob.size;
      if (total > PDF_LIMITS.output) throw new Error('limit');
      blobs.push(blob);
      progress(0.1 + ((i + 1) / groups.length) * 0.8);
    }
    result = { blobs };
  } else if (action === 'inspect') {
    try {
      const source = await load(files[0]);
      const pages = source.getPageCount();
      countCheck(pages);
      result = { blobs: [], pages };
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'encrypted')
        throw error;
      const { openPdf } = await import('./pdf-renderer');
      const { doc, close } = await openPdf(files[0], options.password);
      try {
        result = { blobs: [], pages: doc.numPages };
      } finally {
        await close();
      }
    }
  } else {
    const { openPdf, renderPage } = await import('./pdf-renderer');
    const { doc, close } = await openPdf(files[0], options.password);
    try {
      if (action === 'thumbnails') {
        const start = request.start ?? 1;
        if (!Number.isInteger(start) || start < 1 || start > doc.numPages)
          throw new Error('range');
        const blobs: Blob[] = [];
        const end = Math.min(start + 11, doc.numPages);
        for (let index = start; index <= end; index++) {
          const page = await doc.getPage(index),
            view = page.getViewport({ scale: 1 });
          blobs.push(
            (
              await renderPage(
                page,
                Math.min(180 / view.width, 240 / view.height),
                0.7,
              )
            ).blob,
          );
          progress(0.1 + ((index - start + 1) / (end - start + 1)) * 0.8);
        }
        result = { blobs, pages: doc.numPages };
      } else if (action === 'compress') {
        const output = await PDFDocument.create();
        const preset = pdfPreset(options.preset);
        let total = 0;
        for (let index = 1; index <= doc.numPages; index++) {
          const image = await renderPage(
            await doc.getPage(index),
            preset.dpi / 72,
            preset.quality,
          );
          total += image.blob.size;
          if (total > PDF_LIMITS.output) throw new Error('limit');
          const jpg = await output.embedJpg(await image.blob.arrayBuffer());
          output.addPage([image.width, image.height]).drawImage(jpg, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
          progress(0.1 + (index / doc.numPages) * 0.75);
        }
        result = { blobs: [pdfBlob(await output.save())] };
      } else if (action === 'pptx') {
        const { makePptx } = await import('./pdf-pptx');
        result = { blobs: [await makePptx(doc, options, progress)] };
      } else throw new Error('options');
    } finally {
      await close();
    }
  }
  if (result.blobs.reduce((n, b) => n + b.size, 0) > PDF_LIMITS.output)
    throw new Error('limit');
  progress(1);
  return result;
}
