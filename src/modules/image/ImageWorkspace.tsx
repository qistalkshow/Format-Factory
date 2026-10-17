import { useEffect, useState } from 'preact/hooks';
import type { Locale } from '@/i18n';
import { imageMessages } from '@/i18n/image';
import { useBatch } from './use-batch';
import { ImageCard } from './ImageCard';
import './image.css';
export default function ImageWorkspace({
  input,
  locale,
  onClear,
}: {
  input: File[];
  locale: Locale;
  onClear(): void;
}) {
  const batch = useBatch(input);
  // 批次 Hook 接管 File 後，清除外殼中的輸入引用；取消即可釋放原檔。
  useEffect(() => {
    if (input.length) onClear();
  }, [input]);
  const t = imageMessages[locale];
  const [preview, setPreview] = useState<number>();
  const busy = batch.jobs.some(
    (job) => job.status === 'queued' || job.status === 'running',
  );
  return (
    <section aria-label={t.title}>
      <h2>{t.title}</h2>
      <p>{t.intro}</p>
      <p>{t.limits}</p>
      <p>{t.wasmOffline}</p>
      {!batch.jobs.length && <p>{t.empty}</p>}
      {!!batch.jobs.length && (
        <div class="actions">
          <button
            class="primary"
            disabled={!batch.jobs.some((job) => job.status === 'idle')}
            onClick={() => batch.jobs.forEach(batch.run)}
          >
            {t.runAll}
          </button>
          <button
            onClick={() => {
              batch.clear();
              onClear();
            }}
          >
            {t.clear}
          </button>
        </div>
      )}
      {batch.jobs.map((job) => (
        <ImageCard
          key={job.id}
          job={job}
          t={t}
          preview={preview === job.id}
          onPreview={() => setPreview(preview === job.id ? undefined : job.id)}
          onChange={(change) => batch.patch(job.id, change)}
          onRun={() => batch.run(job)}
          onCancel={() => batch.cancel(job.id)}
        />
      ))}
      {batch.jobs.some((job) => job.result) && (
        <div class="panel actions">
          <button
            disabled={busy || batch.zip.status === 'running'}
            onClick={batch.makeZip}
          >
            {batch.zip.status === 'running' ? t.zipBusy : t.zip}
          </button>
          {batch.zip.status === 'running' && (
            <button onClick={batch.cancelZip}>{t.cancelZip}</button>
          )}
          {batch.zip.url && (
            <a
              class="button"
              href={batch.zip.url}
              download="formatfactory-images.zip"
            >
              {t.zipDownload}
            </a>
          )}
          {batch.zip.status === 'failed' && (
            <p role="alert">{t.errors.processingFailed}</p>
          )}
        </div>
      )}
    </section>
  );
}
