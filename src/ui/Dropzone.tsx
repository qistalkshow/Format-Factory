import { useRef, useState } from 'preact/hooks';
import type { Messages } from '@/i18n';
export function Dropzone({
  t,
  onFiles,
  disabled,
}: {
  t: Messages;
  onFiles(files: File[]): void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <section
      class={`dropzone ${over ? 'drag-over' : ''}`}
      data-testid="dropzone"
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (!disabled) onFiles(Array.from(event.dataTransfer?.files ?? []));
      }}
    >
      <svg class="upload-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 32V9m-9 9 9-9 9 9M9 30v9h30v-9" />
      </svg>
      <h2>{t.drop}</h2>
      <p>{t.dropHint}</p>
      <input
        ref={input}
        hidden
        type="file"
        multiple
        tabIndex={-1}
        aria-label={t.choose}
        disabled={disabled}
        onChange={(event) => {
          onFiles(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = '';
        }}
      />
      <button
        class="primary"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {t.choose}
        <span aria-hidden="true"> ↗</span>
      </button>
    </section>
  );
}
