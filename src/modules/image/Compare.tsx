import { useId, useState } from 'preact/hooks';
import type { ImageMessages } from '@/i18n/image';
export function Compare({
  before,
  after,
  t,
}: {
  before: string;
  after: string;
  t: ImageMessages;
}) {
  const [position, setPosition] = useState(50);
  const id = useId();
  return (
    <section class="comparison" aria-label={t.compare}>
      <div class="compare-labels">
        <span>{t.before}</span>
        <span>{t.after}</span>
      </div>
      <svg viewBox="0 0 800 600" role="img" aria-label={t.compare}>
        <defs>
          <clipPath id={id}>
            <rect width={`${position}%`} height="100%" />
          </clipPath>
        </defs>
        <image
          href={after}
          width="800"
          height="600"
          preserveAspectRatio="xMidYMid meet"
        />
        <g clipPath={`url(#${id})`}>
          <rect width="800" height="600" fill="#dce4e8" />
          <image
            href={before}
            width="800"
            height="600"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
        <line
          x1={`${position}%`}
          x2={`${position}%`}
          y1="0"
          y2="600"
          stroke="#087787"
          stroke-width="4"
        />
      </svg>
      <label>
        {t.position}
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onInput={(e) => setPosition(Number(e.currentTarget.value))}
        />
      </label>
      <p>{t.compareHint}</p>
    </section>
  );
}
