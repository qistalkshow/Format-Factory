import { formatSize } from '@/core/format-size';
import { errorMessage, type ImageMessages } from '@/i18n/image';
import { ImageOptions } from './ImageOptions';
import { Compare } from './Compare';
import { outputName, type ImageJob } from './use-batch';
interface Props {
  job: ImageJob;
  t: ImageMessages;
  preview: boolean;
  onPreview(): void;
  onChange(change: Partial<ImageJob>): void;
  onRun(): void;
  onCancel(): void;
}
export function ImageCard({
  job,
  t,
  preview,
  onPreview,
  onChange,
  onRun,
  onCancel,
}: Props) {
  const busy = job.status === 'queued' || job.status === 'running';
  return (
    <article class="panel image-card" data-testid="image-card">
      <h2 class="file-name">{job.name}</h2>
      <p class="mono">{formatSize(job.size)}</p>
      {job.converter && <ImageOptions job={job} t={t} onChange={onChange} />}
      <p role="status" data-testid="job-status">
        {t[job.status]}
      </p>
      {busy && <progress aria-label={t.running} max="1" value={job.progress} />}
      {job.status === 'failed' && (
        <p role="alert" class="notice">
          {errorMessage(t, job.error)}
        </p>
      )}
      <div class="actions">
        {job.status === 'idle' && (
          <button class="primary" onClick={onRun}>
            {t.run}
          </button>
        )}
        {busy && <button onClick={onCancel}>{t.cancel}</button>}
      </div>
      {job.result && job.url && (
        <div class="result">
          <p class="mono">
            {t.originalSize}: {formatSize(job.size)} → {t.resultSize}:{' '}
            {formatSize(job.result.size)}
            <br />
            {t.saved}:{' '}
            {job.size
              ? ((1 - job.result.size / job.size) * 100).toFixed(1)
              : '0'}
            %
          </p>
          {job.result.size > job.size && job.originalUrl && (
            <>
              <p>{t.larger}</p>
              <label class="check-label">
                <input
                  type="checkbox"
                  checked={job.useOriginal ?? false}
                  onChange={(e) =>
                    onChange({ useOriginal: e.currentTarget.checked })
                  }
                />
                {t.keepOriginal}
              </label>
            </>
          )}
          <div class="actions">
            <a
              class="button primary"
              download={outputName(job)}
              href={job.useOriginal ? job.originalUrl : job.url}
            >
              {job.useOriginal ? t.originalDownload : t.download}
            </a>
            {job.originalUrl && (
              <button aria-expanded={preview} onClick={onPreview}>
                {t.compare}
              </button>
            )}
          </div>
          {preview && job.originalUrl && (
            <Compare before={job.originalUrl} after={job.url} t={t} />
          )}
          {!job.originalUrl && (
            <img
              class="svg-result"
              src={job.url}
              alt={t.after}
              loading="lazy"
            />
          )}
        </div>
      )}
    </article>
  );
}
