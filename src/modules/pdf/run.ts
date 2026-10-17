import type { Converter } from '@/core/converter';
import { pdfWorker } from './client';
import { parsePdfOptions, type PdfOperation } from './options';
export const runPdf =
  (action: PdfOperation): Converter['run'] =>
  async (files, options, ctx) =>
    (
      await pdfWorker(
        { action, files, options: parsePdfOptions(options) },
        ctx.signal,
        ctx.onProgress,
      )
    ).blobs;
