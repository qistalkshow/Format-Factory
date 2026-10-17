import { describe, expect, it, vi } from 'vitest';
import { TaskQueue, type TaskSnapshot } from '@/core/queue';

describe('task queue', () => {
  it('runs serially and reports bounded progress', async () => {
    const snapshots: TaskSnapshot[] = [];
    const queue = new TaskQueue((snapshot) => snapshots.push(snapshot));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const order: string[] = [];
    const first = queue.enqueue(async (_signal, progress) => {
      order.push('first');
      progress(2);
      await gate;
      return 1;
    });
    const second = queue.enqueue(async () => {
      order.push('second');
      return 2;
    });
    expect(order).toEqual(['first']);
    release();
    await expect(first.result).resolves.toBe(1);
    await expect(second.result).resolves.toBe(2);
    expect(order).toEqual(['first', 'second']);
    expect(
      snapshots.some((item) => item.id === first.id && item.progress === 1),
    ).toBe(true);
  });
  it('cancels active and queued jobs without overlapping the next task', async () => {
    const queue = new TaskQueue();
    const first = queue.enqueue(
      (signal) =>
        new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason)),
        ),
    );
    const skipped = vi.fn(async () => 2);
    const second = queue.enqueue(skipped);
    const firstRejection = expect(first.result).rejects.toMatchObject({
      name: 'AbortError',
    });
    const secondRejection = expect(second.result).rejects.toMatchObject({
      name: 'AbortError',
    });
    second.cancel();
    first.cancel();
    await Promise.all([firstRejection, secondRejection]);
    expect(skipped).not.toHaveBeenCalled();
    await expect(queue.enqueue(async () => 3).result).resolves.toBe(3);
  });
  it('continues after errors and skips all pending work on disposal', async () => {
    const queue = new TaskQueue();
    const failed = queue.enqueue(async () => {
      throw new Error('test');
    });
    await expect(failed.result).rejects.toThrow('test');
    await expect(queue.enqueue(async () => 2).result).resolves.toBe(2);
    const active = queue.enqueue(
      (signal) =>
        new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason)),
        ),
    );
    const skipped = vi.fn(async () => 1);
    const pending = queue.enqueue(skipped);
    const outcomes = Promise.allSettled([active.result, pending.result]);
    queue.cancelAll();
    expect(
      (await outcomes).every((outcome) => outcome.status === 'rejected'),
    ).toBe(true);
    expect(skipped).not.toHaveBeenCalled();
  });
});
