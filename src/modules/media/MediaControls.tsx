import type { MediaMessages } from '@/i18n/media';
import {
  mediaPresets,
  type MediaOptions,
  type MediaFormat,
  type MediaPreset,
} from './options';
export function MediaControls({
  value: o,
  onChange,
  disabled,
  t,
}: {
  value: MediaOptions;
  onChange(o: MediaOptions): void;
  disabled: boolean;
  t: MediaMessages;
}) {
  return (
    <fieldset class="media-controls" disabled={disabled}>
      <legend class="media-legend">{t.format}</legend>
      <label>
        {t.format}
        <select
          aria-label={t.format}
          value={o.format}
          onChange={(e) =>
            onChange({ ...o, format: e.currentTarget.value as MediaFormat })
          }
        >
          {(['mp4', 'm4a', 'mp3'] as const).map((format) => (
            <option value={format} key={format}>
              {t[format]}
            </option>
          ))}
        </select>
      </label>
      <div class="media-presets" role="group" aria-label={t.preset}>
        {(['low', 'medium', 'high'] as MediaPreset[]).map((preset) => (
          <button
            type="button"
            key={preset}
            onClick={() => onChange({ ...o, ...mediaPresets[preset] })}
          >
            {t[preset]}
          </button>
        ))}
      </div>
      <details>
        <summary>{t.advanced}</summary>
        {o.format === 'mp4' && (
          <>
            <label>
              {t.crf}: {o.crf}
              <input
                type="range"
                min="18"
                max="40"
                value={o.crf}
                disabled={o.videoKbps !== 0}
                onInput={(e) =>
                  onChange({ ...o, crf: Number(e.currentTarget.value) })
                }
              />
            </label>
            <label>
              {t.height}
              <select
                value={o.height}
                onChange={(e) =>
                  onChange({ ...o, height: Number(e.currentTarget.value) })
                }
              >
                {[480, 720, 1080].map((h) => (
                  <option key={h} value={h}>
                    {h}p
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.videoKbps}
              <input
                type="number"
                min="0"
                max="20000"
                step="100"
                value={o.videoKbps}
                onInput={(e) =>
                  onChange({ ...o, videoKbps: Number(e.currentTarget.value) })
                }
              />
            </label>
            <p>{t.rateHint}</p>
          </>
        )}
        <label>
          {t.audioKbps}
          <select
            value={o.audioKbps}
            onChange={(e) =>
              onChange({ ...o, audioKbps: Number(e.currentTarget.value) })
            }
          >
            {[64, 96, 128, 192, 256, 320].map((rate) => (
              <option key={rate} value={rate}>
                {rate}
              </option>
            ))}
          </select>
        </label>
      </details>
    </fieldset>
  );
}
