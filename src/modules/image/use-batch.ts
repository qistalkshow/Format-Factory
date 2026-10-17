import { useEffect, useRef, useState } from 'preact/hooks';
import { TaskQueue, type TaskStatus } from '@/core/queue';
import { detectFileType } from '@/core/file-type';
import { runWorker } from '@/core/worker-client';
import { imageRegistry } from './registry';
import { defaults, MAX_FILE_BYTES, type ImageOptions } from './options';
export interface ImageJob {
  id: number;
  name: string;
  size: number;
  mime: string;
  file?: File;
  converter: string;
  options: ImageOptions;
  status: TaskStatus | 'idle';
  progress: number;
  error?: string;
  result?: Blob;
  url?: string;
  originalUrl?: string;
  useOriginal?: boolean;
}
export function outputName(job: ImageJob) {
  const name =
    job.name
      .replace(/\.[^.]*$/, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 120) || 'image';
  if (job.useOriginal)
    return `${job.id}-${name}.${job.mime === 'image/jpeg' ? 'jpg' : 'png'}`;
  return `${job.id}-${name}.${job.result?.type === 'image/jpeg' ? 'jpg' : job.result?.type === 'image/svg+xml' ? 'svg' : 'png'}`;
}
export function useBatch(input: File[]) {
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [zip, setZip] = useState<{
    status: 'idle' | 'running' | 'done' | 'failed';
    url?: string;
  }>({ status: 'idle' });
  const queue = useRef(new TaskQueue());
  const handles = useRef(new Map<number, { cancel(): void }>());
  const zipHandle = useRef<{ cancel(): void }>();
  const urls = useRef(new Set<string>());
  const generation = useRef(0);
  const zipRevision = useRef(0);
  const totalResult = useRef(0);
  const allocate = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  };
  const release = () => {
    generation.current++;
    queue.current.cancelAll();
    handles.current.clear();
    zipHandle.current = undefined;
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
    totalResult.current = 0;
  };
  const invalidateZip = () => {
    zipRevision.current++;
    zipHandle.current?.cancel();
    setZip((previous) => {
      if (previous.url) {
        URL.revokeObjectURL(previous.url);
        urls.current.delete(previous.url);
      }
      return { status: 'idle' };
    });
  };
  const patch = (id: number, change: Partial<ImageJob>) => {
    if ('useOriginal' in change || 'result' in change) invalidateZip();
    setJobs((items) =>
      items.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );
  };
  const clear = () => {
    release();
    setJobs([]);
    setZip({ status: 'idle' });
  };
  useEffect(() => {
    if (!input.length) return;
    release();
    setZip({ status: 'idle' });
    setJobs(
      input.map((file, index) => {
        const mime = detectFileType(file).mime;
        const converters = imageRegistry.forType(mime);
        const error =
          file.size > MAX_FILE_BYTES
            ? 'tooLarge'
            : /\.gif$/i.test(file.name) || file.type === 'image/gif'
              ? 'animated'
              : converters.length
                ? undefined
                : 'unsupported';
        return {
          id: index + 1,
          name: file.name,
          size: file.size,
          mime,
          file: error ? undefined : file,
          converter:
            converters.find((c) => c.id.includes('compress'))?.id ??
            converters[0]?.id ??
            '',
          options: { ...defaults },
          status: error ? 'failed' : 'idle',
          progress: 0,
          error,
        };
      }),
    );
  }, [input]);
  useEffect(() => release, []);
  useEffect(() => {
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, []);
  const run = (job: ImageJob) => {
    if (job.status !== 'idle' || !job.file || handles.current.has(job.id))
      return;
    const current = generation.current;
    patch(job.id, { status: 'queued' });
    const task = queue.current.enqueue(async (signal, onProgress) => {
      if (current !== generation.current)
        throw new DOMException('Cancelled', 'AbortError');
      patch(job.id, { status: 'running' });
      return imageRegistry.get(job.converter).run([job.file!], job.options, {
        signal,
        onProgress: (p) => {
          onProgress(p);
          if (current === generation.current) patch(job.id, { progress: p });
        },
      });
    });
    handles.current.set(job.id, task);
    void task.result
      .then(([result]) => {
        if (current !== generation.current) return;
        if (totalResult.current + result.size > 256 * 1024 ** 2)
          throw new Error('tooLarge');
        totalResult.current += result.size;
        patch(job.id, {
          status: 'done',
          progress: 1,
          result,
          url: allocate(result),
          originalUrl:
            job.mime !== 'image/svg+xml' ? allocate(job.file!) : undefined,
        });
      })
      .catch((error: unknown) => {
        if (current !== generation.current) return;
        patch(job.id, {
          status:
            error instanceof DOMException && error.name === 'AbortError'
              ? 'cancelled'
              : 'failed',
          error: error instanceof Error ? error.message : 'processingFailed',
          file: undefined,
        });
      })
      .finally(() => {
        if (current === generation.current) handles.current.delete(job.id);
      });
  };
  const makeZip = () => {
    if (zip.status === 'running') return;
    if (zip.url) {
      URL.revokeObjectURL(zip.url);
      urls.current.delete(zip.url);
    }
    const current = generation.current;
    const revision = ++zipRevision.current;
    const files = jobs
      .filter((job) => job.result)
      .map((job) => ({
        name: outputName(job),
        blob: job.useOriginal ? job.file! : job.result!,
      }));
    if (
      !files.length ||
      files.reduce((sum, file) => sum + file.blob.size, 0) > 256 * 1024 ** 2
    ) {
      setZip({ status: 'failed' });
      return;
    }
    setZip({ status: 'running' });
    const task = queue.current.enqueue((signal, progress) =>
      runWorker({ type: 'zip', files }, signal, progress),
    );
    zipHandle.current = task;
    void task.result
      .then((blob) => {
        if (current === generation.current && revision === zipRevision.current)
          setZip({ status: 'done', url: allocate(blob) });
      })
      .catch(() => {
        if (current === generation.current && revision === zipRevision.current)
          setZip({ status: 'failed' });
      });
  };
  return {
    jobs,
    patch,
    run,
    clear,
    cancel: (id: number) => handles.current.get(id)?.cancel(),
    zip,
    makeZip,
    cancelZip: invalidateZip,
  };
}
