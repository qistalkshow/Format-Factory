const extensions: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const knownMimes = new Set(Object.values(extensions));
export type FileCategory = 'pdf' | 'image' | 'media' | 'office' | 'unknown';

// 僅供介面分類；MIME 與副檔名不是安全驗證，未來引擎仍須驗證內容。
export function detectFileType(file: Pick<File, 'name' | 'type'>): {
  mime: string;
  category: FileCategory;
} {
  const declared = file.type.toLowerCase().split(';')[0].trim();
  const extension = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase()
    : '';
  const mime = knownMimes.has(declared)
    ? declared
    : (extensions[extension ?? ''] ?? 'application/octet-stream');
  const category =
    mime === 'application/pdf'
      ? 'pdf'
      : mime.startsWith('image/')
        ? 'image'
        : /^(audio|video)\//.test(mime)
          ? 'media'
          : mime.includes('openxmlformats')
            ? 'office'
            : 'unknown';
  return { mime, category };
}
