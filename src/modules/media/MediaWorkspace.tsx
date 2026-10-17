import { useEffect } from 'preact/hooks';
import type { Locale } from '@/i18n';
import { mediaMessages, mediaError } from '@/i18n/media';
import { formatSize } from '@/core/format-size';
import { useMedia } from './use-media';
import { MediaControls } from './MediaControls';
import './media.css';
export default function MediaWorkspace({
  input,
  locale,
  onClear,
}: {
  input: File[];
  locale: Locale;
  onClear(): void;
}) {
  const state = useMedia(input),
    t = mediaMessages[locale];
  useEffect(() => {
    if (input.length) onClear();
  }, [input]);
  return (
    <section class="panel media-workspace" aria-label={t.title}>
      <h2>{t.title}</h2>
      <p>{t.tier}</p>
      <p>{t.description}</p>
      <p class="notice">{t.engineNotice}</p>
      <p>{t.limits}</p>
      <a
        href={`${import.meta.env.BASE_URL}media-licenses/index.html`}
        target="_blank"
        rel="noreferrer"
      >
        {t.license}
      </a>
      {!state.files.length ? (
        <p>{t.empty}</p>
      ) : (
        <>
          <ul>
            {state.files.map((file, i) => (
              <li key={i}>
                {file.name} · {formatSize(file.size)}
              </li>
            ))}
          </ul>
          <MediaControls
            value={state.options}
            onChange={state.setOptions}
            disabled={state.busy}
            t={t}
          />
          <div class="media-actions">
            <button onClick={state.start} disabled={state.busy}>
              {t.start}
            </button>
            <button onClick={state.prepare} disabled={state.busy}>
              {t.prepare}
            </button>
            <button onClick={state.clear}>{t.clear}</button>
          </div>
        </>
      )}
      {state.ready && <p role="status">{t.prepared}</p>}
      {state.extra && (
        <p role="status">
          {state.extra === 'offline' ? t.prepare : t.zip}{' '}
          <button onClick={() => state.cancel(0)}>{t.cancel}</button>
        </p>
      )}
      {state.error && <p role="alert">{mediaError(state.error, t)}</p>}
      <div class="media-jobs">
        {state.jobs.map((job) => (
          <article class="media-job" key={job.id} data-testid="media-job">
            <h3>{job.file.name}</h3>
            <p role="status" data-testid="media-status">
              {t[job.status]}
            </p>
            {(job.status === 'queued' || job.status === 'running') && (
              <>
                {job.progress === 0 ? (
                  <>
                    <p>{t.loading}</p>
                    <progress aria-label={job.file.name} />
                  </>
                ) : (
                  <progress
                    max="1"
                    value={job.progress}
                    aria-label={job.file.name}
                  />
                )}
                <button onClick={() => state.cancel(job.id)}>{t.cancel}</button>
              </>
            )}
            {job.error && <p role="alert">{mediaError(job.error, t)}</p>}
            {job.blob && (
              <>
                <p class="media-size">
                  {formatSize(job.file.size)} → {formatSize(job.blob.size)} ·{' '}
                  {t.savings}{' '}
                  {((1 - job.blob.size / job.file.size) * 100).toFixed(1)}%
                </p>
                <a class="button-link" href={job.url} download={job.name}>
                  {t.download}
                </a>
                {job.original && (
                  <>
                    <p>{t.larger}</p>
                    <a href={job.original} download={job.file.name}>
                      {t.original}
                    </a>
                  </>
                )}
                {job.blob.type.startsWith('video/') ? (
                  <video
                    controls
                    preload="metadata"
                    src={job.url}
                    aria-label={t.preview}
                  />
                ) : (
                  <audio
                    controls
                    preload="metadata"
                    src={job.url}
                    aria-label={t.preview}
                  />
                )}
                <p>{t.previewHint}</p>
              </>
            )}
          </article>
        ))}
      </div>
      {state.jobs.filter((j) => j.blob).length > 1 && (
        <button onClick={state.makeZip} disabled={state.busy}>
          {t.zip}
        </button>
      )}
      {state.zip && (
        <a href={state.zip} download="formatfactory-media.zip">
          {t.downloadZip}
        </a>
      )}
    </section>
  );
}
