type RequestFn<T> = () => Promise<T>;

type QueueEntry<T> = {
  fn: RequestFn<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

/**
 * Global request queue to limit concurrent model calls
 */
class RequestQueue {
  private readonly maxConcurrent: number;
  private activeRequests = 0;
  private queue: QueueEntry<unknown>[] = [];
  private readonly pollInterval: number;

  constructor(maxConcurrent = 2, pollInterval = 300) {
    this.maxConcurrent = maxConcurrent;
    this.pollInterval = pollInterval;
  }

  public async enqueue<T>(fn: RequestFn<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const entry: QueueEntry<T> = { fn, resolve, reject };
      this.queue.push(entry);
      this.processQueue();
    });
  }

  public getActiveCount() {
    return this.activeRequests;
  }

  private processQueue() {
    if (this.activeRequests >= this.maxConcurrent) {
      return;
    }

    const next = this.queue.shift();
    if (!next) {
      return;
    }

    this.runEntry(next as QueueEntry<unknown>);

    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), this.pollInterval);
    }
  }

  private async runEntry(entry: QueueEntry<unknown>) {
    this.activeRequests += 1;
    try {
      const result = await entry.fn();
      entry.resolve(result);
    } catch (error) {
      entry.reject(error);
    } finally {
      this.activeRequests -= 1;
      setTimeout(() => this.processQueue(), this.pollInterval);
    }
  }
}

const globalRequestQueue = new RequestQueue(2, 300);

export function queueRequest<T>(fn: RequestFn<T>): Promise<T> {
  return globalRequestQueue.enqueue(fn);
}

export function getQueueStats() {
  return {
    active: globalRequestQueue.getActiveCount(),
  };
}
