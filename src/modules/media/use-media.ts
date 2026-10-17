import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { TaskQueue, type TaskStatus } from '@/core/queue';
import { runWorker } from '@/core/worker-client';
import { detectFileType } from '@/core/file-type';
import { mediaDefaults, MAX_MEDIA_OUTPUT, type MediaOptions } from './options';
import { mediaRegistry } from './registry';
import { prepareMediaOffline } from './offline';
export interface MediaJob {
  id: number;
  file: File;
  status: TaskStatus;
  progress: number;
  error?: string;
  blob?: Blob;
  url?: string;
  name?: string;
  original?: string;
}
export function useMedia(input: File[]) {
  const [files, setFiles] = useState<File[]>([]),
    [jobs, setJobs] = useState<MediaJob[]>([]);
  const [options, setOptions] = useState<MediaOptions>({ ...mediaDefaults });
  const [extra, setExtra] = useState(''),
    [error, setError] = useState(''),
    [zip, setZip] = useState(''),
    [ready, setReady] = useState(false);
  const generation = useRef(0),
    urls = useRef(new Set<string>()),
    pending = useRef(new Map<number, { cancel(): void }>());
  const queue = useRef(new TaskQueue());
  const allocate = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  };
  const release = () => {
    generation.current++;
    queue.current.cancelAll();
    pending.current.clear();
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
  };
  const clear = () => {
    release();
    setFiles([]);
    setJobs([]);
    setZip('');
    setError('');
    setExtra('');
  };
  useLayoutEffect(() => {
    if (!input.length) return;
    clear();
    setFiles(input);
    const mime = detectFileType(input[0]).mime;
    setOptions({
      ...mediaDefaults,
      format:
        mime === 'audio/mpeg' ? 'mp3' : mime === 'audio/mp4' ? 'm4a' : 'mp4',
    });
  }, [input]);
  useEffect(() => release, []);
  useEffect(() => {
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, []);
  const update = (id: number, patch: Partial<MediaJob>) =>
    setJobs((previous) =>
      previous.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    );
  const busy =
    jobs.some((j) => j.status === 'running' || j.status === 'queued') ||
    !!extra;
  const start = () => {
    if (pending.current.size || extra || !files.length) return;
    release();
    setJobs([]);
    setZip('');
    setError('');
    const current = generation.current;
    const snapshot = { ...options };
    let total = 0;
    files.forEach((file, index) => {
      const id = index + 1;
      setJobs((previous) => [
        ...previous,
        { id, file, status: 'queued', progress: 0 },
      ]);
      const task = queue.current.enqueue(async (signal, progress) => {
        if (current !== generation.current) signal.throwIfAborted();
        update(id, { status: 'running' });
        return mediaRegistry
          .get(`media-to-${snapshot.format}`)
          .run([file], snapshot, {
            signal,
            onProgress: (p) => {
              progress(p);
              if (current === generation.current) update(id, { progress: p });
            },
          });
      });
      pending.current.set(id, task);
      void task.result
        .then(([blob]) => {
          if (current !== generation.current) return;
          total += blob.size;
          if (total > MAX_MEDIA_OUTPUT) throw new Error('output');
          update(id, {
            status: 'done',
            progress: 1,
            blob,
            url: allocate(blob),
            name: `formatfactory-media-${id}.${snapshot.format}`,
            original: blob.size > file.size ? allocate(file) : undefined,
          });
        })
        .catch((e: unknown) => {
          if (current !== generation.current) return;
          const aborted = e instanceof DOMException && e.name === 'AbortError';
          update(id, {
            status: aborted ? 'cancelled' : 'failed',
            error: aborted ? '' : e instanceof Error ? e.message : 'convert',
          });
        })
        .finally(() => {
          if (current === generation.current) pending.current.delete(id);
        });
    });
  };
  const auxiliary = (
    kind: string,
    work: (
      signal: AbortSignal,
      progress: (p: number) => void,
    ) => Promise<unknown>,
    done: (result: unknown) => void,
  ) => {
    if (pending.current.size || extra) return;
    const current = generation.current;
    setExtra(kind);
    setError('');
    const task = queue.current.enqueue(work);
    pending.current.set(0, task);
    void task.result
      .then((result) => {
        if (current === generation.current) done(result);
      })
      .catch((e: unknown) => {
        if (
          current === generation.current &&
          !(e instanceof DOMException && e.name === 'AbortError')
        )
          setError(kind === 'offline' ? 'offline' : 'output');
      })
      .finally(() => {
        if (current === generation.current) {
          setExtra('');
          pending.current.delete(0);
        }
      });
  };
  return {
    files,
    jobs,
    options,
    setOptions,
    busy,
    extra,
    error,
    zip,
    ready,
    start,
    clear,
    cancel: (id: number) => pending.current.get(id)?.cancel(),
    prepare: () =>
      auxiliary('offline', prepareMediaOffline, () => setReady(true)),
    makeZip: () =>
      auxiliary(
        'zip',
        (signal, progress) =>
          runWorker(
            {
              type: 'zip',
              files: jobs
                .filter((j) => j.blob)
                .map((j) => ({ name: j.name!, blob: j.blob! })),
            },
            signal,
            progress,
          ),
        (result) => {
          if (result instanceof Blob) {
            if (zip) {
              URL.revokeObjectURL(zip);
              urls.current.delete(zip);
            }
            setZip(allocate(result));
          }
        },
      ),
  };
}
