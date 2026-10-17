export const deferredPdf = (path) =>
  path.startsWith('pdf-engine/') ||
  /^assets\/(?:pdf-|Pdf|exceljs\.min-|jszip\.min-)/.test(path);
export const deferredMedia = (path) =>
  path.startsWith('media-engine/') || /^assets\/(?:media-|Media)/.test(path);
export const precached = (path) =>
  path !== 'THIRD_PARTY_NOTICES.txt' &&
  !path.endsWith('.wasm') &&
  !deferredPdf(path) &&
  !deferredMedia(path) &&
  !path.startsWith('media-licenses/');
