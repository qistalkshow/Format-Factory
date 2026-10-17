import { availablePdfOperations, isOfficeOperation } from './actions';
import { useEffect, useState } from 'preact/hooks';
import type { Locale } from '@/i18n';
import { pdfMessages, pdfError } from '@/i18n/pdf';
import { formatSize } from '@/core/format-size';
import { usePdf } from './use-pdf';
import { PdfControls } from './PdfControls';
import './pdf.css';
export default function PdfWorkspace({
  input,
  locale,
  onClear,
}: {
  input: File[];
  locale: Locale;
  onClear(): void;
}) {
  const s = usePdf(input),
    t = pdfMessages[locale];
  const [ack, setAck] = useState(false),
    [bytes, setBytes] = useState<number>();
  useEffect(() => {
    if (input.length) {
      onClear();
      setAck(false);
    }
  }, [input]);
  useEffect(() => {
    setAck(false);
  }, [s.operation]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}pdf-assets.json`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (
          data &&
          typeof data === 'object' &&
          'bytes' in data &&
          typeof data.bytes === 'number'
        )
          setBytes(data.bytes);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const originalBytes = s.files.reduce((n, f) => n + f.size, 0),
    resultBytes = s.results.reduce((n, r) => n + r.blob.size, 0);
  const office = isOfficeOperation(s.operation);
  const raster = s.operation === 'compress' || s.operation === 'pptx';
  return (
    <section class="pdf-workspace" aria-label={t.title}>
      <h2>{t.title}</h2>
      <p>{t.empty}</p>
      <p>{t.limits}</p>
      <div class="panel">
        <p>{t.engine}</p>
        {bytes !== undefined && (
          <p>
            {t.engineSize}: {formatSize(bytes)}
          </p>
        )}
        <button disabled={s.busy} onClick={s.prepare}>
          {t.prepare}
        </button>
        <p role="status">{s.offlineReady ? t.ready : t.offlineHint}</p>
      </div>
      {!!s.files.length && (
        <div class="panel">
          <PdfControls state={s} t={t} />
          {(raster || office) && (
            <label class="check-label">
              <input
                type="checkbox"
                checked={ack}
                disabled={s.busy}
                onChange={(e) => setAck(e.currentTarget.checked)}
              />
              {office ? t.officeAcknowledge : t.acknowledge}
            </label>
          )}
          <div class="actions">
            <button
              class="primary"
              disabled={
                s.busy ||
                ((raster || office) && !ack) ||
                !availablePdfOperations(s.files).length
              }
              onClick={s.run}
            >
              {t.run}
            </button>
            <button
              onClick={() => {
                s.clear();
                onClear();
              }}
            >
              {t.clear}
            </button>
          </div>
        </div>
      )}
      <p role="status" data-testid="pdf-status">
        {t[s.status]}
      </p>
      {s.busy && (
        <div class="actions">
          <progress aria-label={t.running} max="1" value={s.progress} />
          <button onClick={s.cancel}>{t.cancel}</button>
        </div>
      )}
      {!!s.error && (
        <p role="alert" class="notice">
          {pdfError(t, s.error)}
        </p>
      )}
      {!!s.results.length && (
        <div class="panel pdf-results">
          <p class="mono">
            {t.before}: {formatSize(originalBytes)} → {t.after}:{' '}
            {formatSize(resultBytes)}
            {s.operation === 'compress' && (
              <>
                {' '}
                · {t.saved}:{' '}
                {((1 - resultBytes / originalBytes) * 100).toFixed(1)}%
              </>
            )}
          </p>
          {s.original && resultBytes > originalBytes && (
            <>
              <p>{t.larger}</p>
              <label>
                <input
                  type="checkbox"
                  checked={s.keep}
                  onChange={(e) => s.setKeep(e.currentTarget.checked)}
                />
                {t.keep}
              </label>
            </>
          )}
          {s.results.map((result, index) => (
            <a
              key={result.url}
              class="button"
              download={s.keep ? 'original.pdf' : result.name}
              href={s.keep ? s.original : result.url}
            >
              {s.keep
                ? t.original
                : result.blob.type.includes('wordprocessing')
                  ? t.docxDownload
                  : result.blob.type.includes('spreadsheet')
                    ? t.xlsxDownload
                    : result.blob.type.includes('presentation')
                      ? t.pptxDownload
                      : t.download}{' '}
              {index + 1}
            </a>
          ))}
          {s.results.length > 1 && (
            <div class="actions">
              <button disabled={s.busy} onClick={s.makeZip}>
                {t.zip}
              </button>
              {s.zip && (
                <a
                  class="button"
                  href={s.zip}
                  download="formatfactory-pdfs.zip"
                >
                  {t.zipDownload}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
