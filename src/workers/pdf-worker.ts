import type { PdfRequest, PdfResponse } from '@/modules/pdf/protocol';
// 第三方解析器的錯誤可能包含文件片段，正式版僅回傳白名單錯誤代碼。
if (import.meta.env.PROD)
  console.log = console.info = console.warn = console.error = () => {};
const send = (message: PdfResponse) => self.postMessage(message);
self.onmessage = async (event: MessageEvent<PdfRequest>) => {
  try {
    const { processPdf } = await import('@/modules/pdf/pdf-engine');
    const result = await processPdf(event.data, (value) =>
      send({ type: 'progress', value }),
    );
    send({ type: 'result', ...result });
  } catch (error: unknown) {
    const known = [
      'officeLimit',
      'unsafeOffice',
      'externalOffice',
      'officeEncrypted',
      'officeUnsupported',
      'officeFormula',
      'noOfficeContent',
      'limit',
      'range',
      'options',
      'encrypted',
      'password',
      'passwordWrong',
      'corrupt',
      'browser',
      'render',
      'failed',
    ];
    const code =
      error instanceof Error && known.includes(error.message)
        ? error.message
        : 'failed';
    send({ type: 'error', code });
  }
};
