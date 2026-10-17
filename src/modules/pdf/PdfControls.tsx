import { availablePdfOperations, isOfficeOperation } from './actions';
import { useRef } from 'preact/hooks';
import type { PdfMessages } from '@/i18n/pdf';
import type { PdfState } from './use-pdf';
import type { PdfOptions, PdfOperation } from './options';
export function PdfControls({
  state: s,
  t,
}: {
  state: PdfState;
  t: PdfMessages;
}) {
  const dragged = useRef<number>();
  const office = isOfficeOperation(s.operation),
    fromOffice = s.operation.startsWith('from-');
  const change = (value: Partial<PdfOptions>) =>
    s.setOptions({ ...s.options, ...value });
  return (
    <fieldset disabled={s.busy} class="pdf-controls">
      <legend>{t.action}</legend>
      <ol aria-label={t.order} class="pdf-files">
        {s.files.map((file, index) => (
          <li
            key={index}
            draggable={!s.busy}
            onDragStart={() => {
              dragged.current = index;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragged.current !== undefined)
                s.reorder(dragged.current, index);
              dragged.current = undefined;
            }}
          >
            <span class="file-name">{file.name}</span>
            <div class="actions">
              <button
                disabled={index === 0}
                onClick={() => s.reorder(index, index - 1)}
                aria-label={`${t.up} ${index + 1}`}
              >
                ↑ {t.up}
              </button>
              <button
                disabled={index === s.files.length - 1}
                onClick={() => s.reorder(index, index + 1)}
                aria-label={`${t.down} ${index + 1}`}
              >
                ↓ {t.down}
              </button>
            </div>
          </li>
        ))}
      </ol>
      <label>
        {t.action}
        <select
          aria-label={t.action}
          value={s.operation}
          onChange={(e) =>
            s.setOperation(e.currentTarget.value as PdfOperation)
          }
        >
          {availablePdfOperations(s.files).map((op) => (
            <option key={op} value={op}>
              {t[op]}
            </option>
          ))}
        </select>
      </label>
      <p>{office ? t.officeTier : t.tier}</p>
      {office ? (
        <>
          <p class="notice">{fromOffice ? t.officeImport : t.officeExport}</p>
          <p>{t.officeLimits}</p>
        </>
      ) : s.operation === 'merge' || s.operation === 'split' ? (
        <p>{t.structural}</p>
      ) : (
        <>
          <p class="notice">{t.raster}</p>
          {s.operation === 'pptx' && <p>{t.pptxHint}</p>}
          <label>
            {t.preset}
            <select
              value={s.options.preset}
              onChange={(e) =>
                change({
                  preset: e.currentTarget.value as PdfOptions['preset'],
                })
              }
            >
              {(['low', 'medium', 'high'] as const).map((p) => (
                <option key={p} value={p}>
                  {t[p]}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {s.files.length === 1 && !fromOffice && (
        <>
          <label>
            {t.password}
            <input
              type="password"
              autoComplete="off"
              maxLength={1024}
              value={s.options.password}
              onInput={(e) => change({ password: e.currentTarget.value })}
            />
          </label>
          <p>{t.passwordHint}</p>
          <div class="actions">
            <button onClick={() => s.inspect()}>{t.inspect}</button>
            {s.pages > 0 && (
              <span>
                {t.pages}: {s.pages}
              </span>
            )}
          </div>
        </>
      )}
      {s.operation === 'split' && (
        <>
          <label>
            {t.mode}
            <select
              value={s.options.splitMode}
              onChange={(e) =>
                change({
                  splitMode: e.currentTarget.value as PdfOptions['splitMode'],
                })
              }
            >
              {(['range', 'every', 'selected'] as const).map((mode) => (
                <option key={mode} value={mode}>
                  {t[mode]}
                </option>
              ))}
            </select>
          </label>
          {s.options.splitMode === 'range' && (
            <label>
              {t.ranges}
              <input
                value={s.options.ranges}
                maxLength={4096}
                onInput={(e) => change({ ranges: e.currentTarget.value })}
              />
            </label>
          )}
          {s.options.splitMode === 'every' && (
            <label>
              {t.interval}
              <input
                type="number"
                min="1"
                max="300"
                value={s.options.every}
                onInput={(e) =>
                  change({ every: e.currentTarget.valueAsNumber })
                }
              />
            </label>
          )}
          {s.options.splitMode === 'selected' && (
            <>
              <div class="actions">
                <button onClick={() => s.inspect(true)}>{t.thumbnails}</button>
                <button
                  disabled={s.start === 1}
                  onClick={() => s.setStart(Math.max(1, s.start - 12))}
                >
                  {t.prev}
                </button>
                <span>
                  {s.start}–{Math.min(s.start + 11, s.pages || s.start + 11)}
                </span>
                <button
                  disabled={!s.pages || s.start + 12 > s.pages}
                  onClick={() => s.setStart(s.start + 12)}
                >
                  {t.next}
                </button>
              </div>
              <div class="pdf-thumbnails">
                {s.thumbs
                  .filter(
                    (thumb) =>
                      thumb.page >= s.start && thumb.page < s.start + 12,
                  )
                  .map((thumb) => (
                    <label key={thumb.page}>
                      <img
                        src={thumb.url}
                        alt={`${t.page} ${thumb.page}`}
                        loading="lazy"
                      />
                      <span>
                        <input
                          type="checkbox"
                          checked={s.options.selected.includes(thumb.page)}
                          onChange={(e) =>
                            change({
                              selected: e.currentTarget.checked
                                ? [...s.options.selected, thumb.page]
                                : s.options.selected.filter(
                                    (n) => n !== thumb.page,
                                  ),
                            })
                          }
                        />
                        {t.page} {thumb.page}
                      </span>
                    </label>
                  ))}
              </div>
            </>
          )}
        </>
      )}
    </fieldset>
  );
}
