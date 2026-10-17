import type { PdfOptions } from '../options';
export type OfficeOperation =
  'docx' | 'xlsx' | 'from-docx' | 'from-xlsx' | 'from-pptx';
export async function processOffice(
  action: OfficeOperation,
  files: Blob[],
  options: PdfOptions,
  progress: (p: number) => void,
) {
  if ((action === 'docx' || action === 'xlsx') && files.length !== 1)
    throw new Error('options');
  const blobs: Blob[] = [];
  let total = 0;
  for (const [i, file] of files.entries()) {
    const notify = (p: number) => progress((i + p) / files.length);
    let blob: Blob;
    if (action === 'docx') {
      const { pdfDocx } = await import('./pdf-office-docx');
      blob = await pdfDocx(file, options.password, notify, options.docxMode);
    } else if (action === 'xlsx') {
      const { pdfXlsx } = await import('./pdf-office-xlsx');
      blob = await pdfXlsx(file, options.password, notify);
    } else if (action === 'from-docx') {
      const { docxPdf } = await import('./pdf-office-from-docx');
      blob = await docxPdf(file, notify);
    } else if (action === 'from-xlsx') {
      const { xlsxPdf } = await import('./pdf-office-from-xlsx');
      blob = await xlsxPdf(file, notify);
    } else {
      const { pptxPdf } = await import('./pdf-office-from-pptx');
      blob = await pptxPdf(file, notify);
    }
    total += blob.size;
    if (total > 128 * 1024 ** 2) throw new Error('officeLimit');
    blobs.push(blob);
  }
  progress(1);
  return { blobs };
}
