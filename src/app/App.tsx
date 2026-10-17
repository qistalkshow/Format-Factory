import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { messages, type Locale } from '@/i18n';
import { Dropzone } from '@/ui/Dropzone';
import { usePreferences } from './preferences';
import { useOffline } from './offline';
import { Settings } from './Settings';
import { InfoPage } from './InfoPage';
import { ToolBoundary } from './ToolBoundary';
import { detectFileType } from '@/core/file-type';
type WorkspaceComponent = ComponentType<{
  input: File[];
  locale: Locale;
  onClear(): void;
}>;
export function App() {
  const [preferences, setPreferences] = usePreferences();
  const t = messages[preferences.locale];
  const [page, setPage] = useState<'home' | 'settings' | 'privacy' | 'help'>(
    'home',
  );
  const [files, setFiles] = useState<File[]>([]);
  const [activeModule, setActiveModule] = useState<'image' | 'pdf' | 'media'>();
  const [Workspace, setWorkspace] = useState<WorkspaceComponent>();
  const [error, setError] = useState<'limit' | 'failed' | 'mixed'>();
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const workspaceRegion = useRef<HTMLDivElement>(null);
  const offline = useOffline();
  const selectFiles = (input: File[]) => {
    if (!input.length) return;
    if (
      input.length > 20 ||
      input.reduce((sum, file) => sum + file.size, 0) > 128 * 1024 ** 2
    ) {
      setError('limit');
      return;
    }
    const categories = input.map((file) => detectFileType(file).category);
    const next =
      categories[0] === 'pdf' || categories[0] === 'office'
        ? 'pdf'
        : categories[0] === 'media'
          ? 'media'
          : 'image';
    if (
      categories.some(
        (category) =>
          (category === 'pdf' || category === 'office'
            ? 'pdf'
            : category === 'media'
              ? 'media'
              : 'image') !== next,
      )
    ) {
      setError('mixed');
      return;
    }
    setError(undefined);
    setFiles(input);
    if (next !== activeModule) setWorkspace(undefined);
    setActiveModule(next);
  };
  useEffect(() => {
    if (!activeModule || Workspace) return;
    let active = true;
    const loaded = (module: { default: WorkspaceComponent }) => {
      if (active) setWorkspace(() => module.default);
    };
    const failed = () => {
      if (active) setError('failed');
    };
    // 分開 import 呼叫，避免建置器把條件式 import 的 CSS 預載清單合併成另一模組。
    if (activeModule === 'pdf')
      void import('@/modules/pdf/PdfWorkspace').then(loaded).catch(failed);
    else if (activeModule === 'media')
      void import('@/modules/media/MediaWorkspace').then(loaded).catch(failed);
    else
      void import('@/modules/image/ImageWorkspace').then(loaded).catch(failed);
    return () => {
      active = false;
    };
  }, [activeModule, Workspace]);
  useEffect(() => {
    if (Workspace && page === 'home') workspaceRegion.current?.focus();
  }, [Workspace]);
  useEffect(() => {
    if (first.current) first.current = false;
    else heading.current?.focus();
  }, [page]);
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (page === 'home' && event.clipboardData?.files.length) {
        event.preventDefault();
        selectFiles(Array.from(event.clipboardData.files));
      }
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  });
  useEffect(() => {
    const clear = () => {
      setFiles([]);
      setActiveModule(undefined);
      setWorkspace(undefined);
    };
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, []);
  return (
    <div class="shell">
      <a class="skip-link" href="#main" tabIndex={0}>
        {t.skip}
      </a>
      <header class="header">
        <a
          class="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage('home');
          }}
          aria-label="FormatFactory"
        >
          <span class="brand-mark" aria-hidden="true">
            F
          </span>
          <span>
            FormatFactory<span class="brand-sub">{t.title}</span>
          </span>
        </a>
        <span class="build-tag">M5</span>
      </header>
      <main id="main" tabIndex={-1}>
        <div hidden={page !== 'home'}>
          <section class="intro">
            <p class="eyebrow">{t.eyebrow}</p>
            <h1 ref={page === 'home' ? heading : undefined} tabIndex={-1}>
              {t.headline}
            </h1>
            <p>{t.intro}</p>
          </section>
          <Dropzone t={t} onFiles={selectFiles} disabled={false} />
          {error && (
            <p role="alert" class="notice">
              {t[error]}
              {error === 'failed' && (
                <button onClick={() => window.location.reload()}>
                  {t.retry}
                </button>
              )}
            </p>
          )}
          {activeModule && Workspace && (
            <div
              ref={workspaceRegion}
              tabIndex={-1}
              role="region"
              aria-label={t[activeModule]}
            >
              <ToolBoundary
                key={activeModule}
                t={t}
                onReset={() => {
                  setFiles([]);
                  setWorkspace(undefined);
                  setActiveModule(undefined);
                  heading.current?.focus();
                }}
              >
                <Workspace
                  input={files}
                  locale={preferences.locale}
                  onClear={() => setFiles([])}
                />
              </ToolBoundary>
            </div>
          )}
          {activeModule && !Workspace && !error && (
            <p role="status">{t.loading}</p>
          )}
          <nav class="categories" aria-label={t.title}>
            {(['pdf', 'media', 'image'] as const).map((category, index) => (
              <button
                key={category}
                class="category"
                onClick={() => {
                  if (category !== activeModule) {
                    setFiles([]);
                    setWorkspace(undefined);
                    setActiveModule(category);
                    setError(undefined);
                  }
                }}
              >
                <span class="category-index" aria-hidden="true">
                  0{index + 1}
                </span>
                <strong>{t[category]}</strong>
                <span>
                  {category === 'image'
                    ? t.available
                    : category === 'pdf'
                      ? t.pdfAvailable
                      : t.mediaAvailable}
                </span>
              </button>
            ))}
            <button class="category" onClick={() => setPage('settings')}>
              <span class="category-index" aria-hidden="true">
                04
              </span>
              <strong>{t.settings}</strong>
              <span aria-hidden="true">↗</span>
            </button>
          </nav>
        </div>
        {page !== 'home' && (
          <section class="panel subpage">
            <button onClick={() => setPage('home')}>← {t.home}</button>
            <h1 ref={heading} tabIndex={-1}>
              {t[page]}
            </h1>
            {page === 'settings' ? (
              <Settings t={t} value={preferences} onChange={setPreferences} />
            ) : (
              <InfoPage t={t} privacy={page === 'privacy'} />
            )}
          </section>
        )}
      </main>
      <footer>
        <p class="privacy-badge">{t.privacyBadge}</p>
        <button class="text-button" onClick={() => setPage('privacy')}>
          {t.privacy}
        </button>
        <button class="text-button" onClick={() => setPage('help')}>
          {t.help}
        </button>
        <div class="footer-meta">
          <span>{t.build}</span>
          <span role="status" data-testid="offline-status">
            {t[offline]}
          </span>
        </div>
      </footer>
    </div>
  );
}
