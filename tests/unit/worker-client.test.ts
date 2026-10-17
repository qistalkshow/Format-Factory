import { defaults } from '@/modules/image/options';
import { afterEach, expect, it, vi } from 'vitest';
import { runWorker } from '@/core/worker-client';

class TestWorker {
  static last: TestWorker;
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  onmessageerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    TestWorker.last = this;
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const request = {
  type: 'image' as const,
  file: new Blob(),
  operation: 'compress' as const,
  options: defaults,
};
it('terminates the real worker boundary when aborted', async () => {
  vi.stubGlobal('Worker', TestWorker);
  const controller = new AbortController();
  const result = runWorker(request, controller.signal, vi.fn());
  const rejection = expect(result).rejects.toMatchObject({
    name: 'AbortError',
  });
  controller.abort();
  await rejection;
  expect(TestWorker.last.terminate).toHaveBeenCalledOnce();
});
it('returns the transferred content, reports progress and releases the worker', async () => {
  vi.stubGlobal('Worker', TestWorker);
  const progress = vi.fn();
  const result = runWorker(request, new AbortController().signal, progress);
  TestWorker.last.onmessage?.({ data: { type: 'progress', value: 0.5 } });
  TestWorker.last.onmessage?.({
    data: { type: 'result', blob: new Blob(['image']) },
  });
  const blob = await result;
  expect(await blob.text()).toBe('image');
  expect(progress).toHaveBeenCalledWith(0.5);
  expect(TestWorker.last.terminate).toHaveBeenCalledOnce();
});
it('fails and terminates stalled workers', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('Worker', TestWorker);
  const result = runWorker(request, new AbortController().signal, vi.fn());
  const rejection = expect(result).rejects.toThrow('timeout');
  await vi.advanceTimersByTimeAsync(120_000);
  await rejection;
  expect(TestWorker.last.terminate).toHaveBeenCalledOnce();
});
