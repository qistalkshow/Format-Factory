import { availablePdfOperations } from './actions';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { TaskQueue, type TaskStatus } from '@/core/queue';
import { runWorker } from '@/core/worker-client';
import { pdfWorker } from './client';
import { pdfDefaults, type PdfOperation, type PdfOptions } from './options';
import { pdfRegistry } from './registry';
import { preparePdfOffline } from './offline';
export function usePdf(input: File[]) {
  const [files, setFiles] = useState<File[]>([]);
  const [operation, setOperation] = useState<PdfOperation>('merge');
  const [options, setOptions] = useState<PdfOptions>({ ...pdfDefaults });
  const [status, setStatus] = useState<TaskStatus | 'idle'>('idle');
  const [progress, setProgress] = useState(0),
    [error, setError] = useState('');
  const [pages, setPages] = useState(0),
    [start, setStart] = useState(1);
  const [thumbs, setThumbs] = useState<{ page: number; url: string }[]>([]);
  const [results, setResults] = useState<
    { blob: Blob; url: string; name: string }[]
  >([]);
  const [zip, setZip] = useState(''),
    [original, setOriginal] = useState(''),
    [keep, setKeep] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const queue = useRef(new TaskQueue()),
    task = useRef<{ cancel(): void }>(),
    generation = useRef(0);
  const urls = useRef(new Set<string>()),
    thumbUrls = useRef(new Set<string>());
  const allocate = (blob: Blob, thumbnail = false) => {
    const url = URL.createObjectURL(blob);
    (thumbnail ? thumbUrls : urls).current.add(url);
    return url;
  };
  const releaseSet = (set: Set<string>) => {
    for (const url of set) URL.revokeObjectURL(url);
    set.clear();
  };
  const clearResults = () => {
    releaseSet(urls.current);
    setResults([]);
    setZip('');
    setOriginal('');
    setKeep(false);
  };
  const release = () => {
    generation.current++;
    queue.current.cancelAll();
    task.current = undefined;
    releaseSet(urls.current);
    releaseSet(thumbUrls.current);
  };
  const clear = () => {
    release();
    setFiles([]);
    setOptions({ ...pdfDefaults });
    setResults([]);
    setThumbs([]);
    setZip('');
    setOriginal('');
    setKeep(false);
    setPages(0);
    setStatus('idle');
    setError('');
  };
  useLayoutEffect(() => {
    if (!input.length) return;
    clear();
    setFiles(input);
    const actions = availablePdfOperations(input);
    setOperation(actions.includes('split') ? 'split' : (actions[0] ?? 'merge'));
    if (!actions.length) setError('officeMixed');
    setStart(1);
  }, [input]);
  useEffect(() => release, []);
  useEffect(() => {
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, []);
  const busy = status === 'running' || status === 'queued';
  function execute<T>(
    work: (signal: AbortSignal, progress: (n: number) => void) => Promise<T>,
    done: (result: T) => void,
  ) {
    if (task.current) return;
    const current = generation.current;
    setError('');
    setProgress(0);
    setStatus('queued');
    const pending = queue.current.enqueue((signal, notify) => {
      setStatus('running');
      return work(signal, (p) => {
        notify(p);
        if (current === generation.current) setProgress(p);
      });
    });
    task.current = pending;
    void pending.result
      .then((result) => {
        if (current === generation.current) {
          done(result);
          setStatus('done');
          setProgress(1);
        }
      })
      .catch((error: unknown) => {
        if (current !== generation.current) return;
        setStatus(
          error instanceof DOMException && error.name === 'AbortError'
            ? 'cancelled'
            : 'failed',
        );
        setError(
          error instanceof DOMException && error.name === 'AbortError'
            ? ''
            : error instanceof Error
              ? error.message
              : 'failed',
        );
      })
      .finally(() => {
        if (current === generation.current) task.current = undefined;
      });
  }
  const run = () => {
    clearResults();
    execute(
      (signal, onProgress) =>
        pdfRegistry
          .get(`pdf-${operation}`)
          .run(files, options, { signal, onProgress }),
      (blobs) => {
        setResults(
          blobs.map((blob, i) => ({
            blob,
            url: allocate(blob),
            name: `formatfactory-${operation}-${i + 1}.${['pptx', 'docx', 'xlsx'].includes(operation) ? operation : 'pdf'}`,
          })),
        );
        if (operation === 'compress' && files[0])
          setOriginal(allocate(files[0]));
        setOptions((previous) => ({ ...previous, password: '' }));
      },
    );
  };
  const inspect = (thumbnails = false) =>
    execute(
      (signal, onProgress) =>
        pdfWorker(
          {
            action: thumbnails ? 'thumbnails' : 'inspect',
            files,
            options,
            start,
          },
          signal,
          onProgress,
        ),
      (result) => {
        setPages(result.pages ?? 0);
        if (thumbnails) {
          releaseSet(thumbUrls.current);
          setThumbs(
            result.blobs.map((blob, i) => ({
              page: start + i,
              url: allocate(blob, true),
            })),
          );
        }
      },
    );
  const reorder = (from: number, to: number) => {
    if (busy || from === to || to < 0 || to >= files.length) return;
    const next = [...files];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setFiles(next);
    clearResults();
  };
  const makeZip = () =>
    execute(
      (signal, onProgress) =>
        runWorker(
          {
            type: 'zip',
            files: results.map((r) => ({ name: r.name, blob: r.blob })),
          },
          signal,
          onProgress,
        ),
      (blob) => {
        if (zip) {
          URL.revokeObjectURL(zip);
          urls.current.delete(zip);
        }
        setZip(allocate(blob));
      },
    );
  return {
    files,
    operation,
    setOperation: (next: PdfOperation) => {
      clearResults();
      setStatus('idle');
      setError('');
      setOperation(next);
    },
    options,
    setOptions,
    status,
    progress,
    error,
    pages,
    start,
    setStart,
    thumbs,
    results,
    zip,
    original,
    keep,
    setKeep,
    offlineReady,
    busy,
    run,
    inspect,
    reorder,
    clear,
    makeZip,
    cancel: () => task.current?.cancel(),
    prepare: () => execute(preparePdfOffline, () => setOfflineReady(true)),
  };
}
export type PdfState = ReturnType<typeof usePdf>;
