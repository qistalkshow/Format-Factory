import type { Locale, Messages } from '@/i18n';
import type { Theme } from './preferences';
interface Preferences {
  theme: Theme;
  locale: Locale;
}
export function Settings({
  t,
  value,
  onChange,
}: {
  t: Messages;
  value: Preferences;
  onChange(value: Preferences): void;
}) {
  return (
    <div class="settings-grid">
      <label>
        {t.theme}
        <select
          value={value.theme}
          onChange={(e) =>
            onChange({ ...value, theme: e.currentTarget.value as Theme })
          }
        >
          {(['dark', 'light', 'system'] as const).map((theme) => (
            <option key={theme} value={theme}>
              {t[theme]}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t.language}
        <select
          value={value.locale}
          onChange={(e) =>
            onChange({
              ...value,
              locale: e.currentTarget.value === 'en' ? 'en' : 'zh-TW',
            })
          }
        >
          <option value="zh-TW">繁體中文</option>
          <option value="en">English</option>
        </select>
      </label>
    </div>
  );
}
