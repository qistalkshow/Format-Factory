import { imageRegistry } from './registry';
import { compressionPreset, type ImageOptions as Options } from './options';
import type { ImageMessages } from '@/i18n/image';
import type { ImageJob } from './use-batch';
export function ImageOptions({
  job,
  t,
  onChange,
}: {
  job: ImageJob;
  t: ImageMessages;
  onChange(change: Partial<ImageJob>): void;
}) {
  const options = job.options;
  const change = (next: Partial<Options>) =>
    onChange({ options: { ...options, ...next } });
  const compression = job.converter.includes('compress');
  const trace = job.converter === 'image-trace';
  const pngCompression = job.converter === 'image-compress-png';
  const preset =
    (['low', 'medium', 'high'] as const).find((p) => {
      const pair = compressionPreset(p);
      return pair.quality === options.quality && pair.effort === options.effort;
    }) ?? 'custom';
  return (
    <fieldset disabled={job.status !== 'idle'} class="image-options">
      <legend>{t.action}</legend>
      <label>
        {t.action}
        <select
          aria-label={t.action}
          value={job.converter}
          onChange={(e) => onChange({ converter: e.currentTarget.value })}
        >
          {imageRegistry.forType(job.mime).map((c) => (
            <option key={c.id} value={c.id}>
              {t[c.id as 'image-to-png']}
            </option>
          ))}
        </select>
      </label>
      <p class="quality-tier">{trace ? t.tier2 : t.tier1}</p>
      {job.converter === 'image-to-png' && job.mime === 'image/jpeg' && (
        <p>{t.pngHint}</p>
      )}
      {job.mime === 'image/svg+xml' && <p>{t.svgHint}</p>}
      {(job.converter === 'image-to-jpeg' || trace) && (
        <label>
          {t.background}
          <input
            type="color"
            value={options.background}
            onInput={(e) => change({ background: e.currentTarget.value })}
          />
        </label>
      )}
      <label>
        {t.width}
        <input
          type="number"
          min="0"
          max="8192"
          step="1"
          value={options.width}
          onInput={(e) => change({ width: e.currentTarget.valueAsNumber })}
        />
      </label>
      {job.mime === 'image/svg+xml' && (
        <label>
          {t.scale}
          <select
            value={options.scale}
            onChange={(e) => change({ scale: Number(e.currentTarget.value) })}
          >
            {[1, 2, 4].map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
      )}
      {compression && (
        <>
          <label>
            {t.preset}
            <select
              value={preset}
              onChange={(e) => {
                if (e.currentTarget.value !== 'custom')
                  change(
                    compressionPreset(
                      e.currentTarget.value as 'low' | 'medium' | 'high',
                    ),
                  );
              }}
            >
              {(['low', 'medium', 'high', 'custom'] as const).map((p) => (
                <option key={p} value={p}>
                  {t[p]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {pngCompression ? t.effort : t.quality}{' '}
            <span aria-hidden="true">
              {pngCompression ? options.effort : options.quality}
            </span>
            <input
              type="range"
              min={pngCompression ? 0 : 1}
              max={pngCompression ? 6 : 100}
              value={pngCompression ? options.effort : options.quality}
              onInput={(e) =>
                change(
                  pngCompression
                    ? { effort: Number(e.currentTarget.value) }
                    : { quality: Number(e.currentTarget.value) },
                )
              }
            />
          </label>
          {pngCompression && <p>{t.pngLossless}</p>}
          <label class="check-label">
            <input
              type="checkbox"
              checked={options.keepMetadata}
              onChange={(e) =>
                change({ keepMetadata: e.currentTarget.checked })
              }
            />
            {t.metadata}
          </label>
          <p>{t.metadataHint}</p>
          <p class="engine-notice">
            {pngCompression ? t.enginePng : t.engineJpeg}
          </p>
        </>
      )}
      {trace && (
        <>
          <p>{t.traceHint}</p>
          <label>
            {t.tracePreset}
            <select
              value={options.tracePreset}
              onChange={(e) =>
                change({
                  tracePreset: e.currentTarget.value as Options['tracePreset'],
                })
              }
            >
              {(['mono', 'few', 'many'] as const).map((p) => (
                <option key={p} value={p}>
                  {t[p]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.detail} <span aria-hidden="true">{options.detail}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={options.detail}
              onInput={(e) => change({ detail: Number(e.currentTarget.value) })}
            />
          </label>
        </>
      )}
    </fieldset>
  );
}
