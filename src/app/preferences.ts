import { useEffect, useState } from 'preact/hooks';
import type { Locale } from '@/i18n';
export type Theme = 'dark' | 'light' | 'system';
interface Preferences {
  theme: Theme;
  locale: Locale;
}
const defaults: Preferences = { theme: 'dark', locale: 'zh-TW' };
function read(): Preferences {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem('formatfactory-preferences') ?? 'null',
    );
    if (!value || typeof value !== 'object') return defaults;
    return {
      theme:
        'theme' in value &&
        (value.theme === 'light' || value.theme === 'system')
          ? value.theme
          : 'dark',
      locale: 'locale' in value && value.locale === 'en' ? 'en' : 'zh-TW',
    };
  } catch {
    return defaults;
  }
}
export function usePreferences() {
  const [preferences, setPreferences] = useState(read);
  useEffect(() => {
    try {
      localStorage.setItem(
        'formatfactory-preferences',
        JSON.stringify(preferences),
      );
    } catch {
      /* 私密模式仍可使用記憶體偏好。 */
    }
    document.documentElement.lang = preferences.locale;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        preferences.theme === 'system'
          ? media.matches
            ? 'dark'
            : 'light'
          : preferences.theme;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preferences]);
  return [preferences, setPreferences] as const;
}
