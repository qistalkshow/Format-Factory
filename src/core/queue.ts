export type TaskStatus = 'queued' | 'running' | 'done' | 'cancelled' | 'failed';
export interface TaskSnapshot {
  id: number;
  status: TaskStatus;
  progress: number;
}
type Work<T> = (
  signal: AbortSignal,
  progress: (value: number) => void,
) => Promise<T>;
interface Entry {
  id: number;
  controller: AbortController;
  execute(): Promise<void>;
}

export class TaskQueue {
  private pending: Entry[] = [];
  private active?: Entry;
  private sequence = 0;
  constructor(private notify: (task: TaskSnapshot) => void = () => {}) {}

  enqueue<T>(work: Work<T>): {
    id: number;
    result: Promise<T>;
    cancel(): void;
  } {
    const id = ++this.sequence;
    const controller = new AbortController();
    let rejectResult: (reason: unknown) => void = () => {};
    let settled = false;
    const emit = (status: TaskStatus, progress = 0) =>
      this.notify({ id, status, progress });
    const result = new Promise<T>((resolve, reject) => {
      rejectResult = reject;
      const entry: Entry = {
        id,
        controller,
        execute: async () => {
          emit('running');
          try {
            controller.signal.throwIfAborted();
            const output = await work(controller.signal, (p) => {
              if (!controller.signal.aborted && Number.isFinite(p))
                emit('running', Math.max(0, Math.min(1, p)));
            });
            controller.signal.throwIfAborted();
            settled = true;
            emit('done', 1);
            resolve(output);
          } catch (error) {
            settled = true;
            emit(controller.signal.aborted ? 'cancelled' : 'failed');
            reject(error);
          }
        },
      };
      this.pending.push(entry);
    });
    emit('queued');
    this.pump();
    return {
      id,
      result,
      cancel: () => {
        if (settled || controller.signal.aborted) return;
        controller.abort();
        const index = this.pending.findIndex((item) => item.id === id);
        if (index >= 0) {
          this.pending.splice(index, 1);
          settled = true;
          emit('cancelled');
          rejectResult(new DOMException('Cancelled', 'AbortError'));
        }
      },
    };
  }

  cancelAll(): void {
    this.active?.controller.abort();
    // 待執行工作透過已取消的 signal 結束，不執行實際工作。
    for (const entry of this.pending) entry.controller.abort();
  }

  private pump(): void {
    if (this.active) return;
    const next = this.pending.shift();
    if (!next) return;
    this.active = next;
    void next.execute().finally(() => {
      this.active = undefined;
      this.pump();
    });
  }
}
