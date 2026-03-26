import crypto from 'crypto';
import type { MessageClassId } from '@/lib/messaging/messageClasses';

interface CacheEntry<T> {
  result: T;
  storedAt: number;
  estTokens?: number;
}

interface InFlightEntry<T> {
  waiters: Array<(value: T) => void>;
  rejecters: Array<(err: unknown) => void>;
}

export type DuplicateStatus = 'fresh' | 'coalesced' | 'replayed';

export interface PromptCacheKey {
  agentId?: string;
  taskId?: string;
  model: string;
  messageClass?: MessageClassId;
  promptHash: string;
  contextHash?: string;
  toolStateHash?: string;
}

interface RunOptions {
  allowReplay: boolean;
  replayTtlMs?: number;
  estTokens?: number;
  coalesceInFlight?: boolean;
}

interface RunResult<T> {
  status: DuplicateStatus;
  value: T;
}

const DEFAULT_REPLAY_TTL = 30_000;

function buildKey(parts: PromptCacheKey): string {
  const raw = [
    parts.agentId || 'agent',
    parts.taskId || 'task',
    parts.model,
    parts.messageClass || 'class',
    parts.promptHash,
    parts.contextHash || 'ctx',
    parts.toolStateHash || 'tool',
  ].join('|');
  return crypto.createHash('sha1').update(raw).digest('hex');
}

class PromptCache {
  private inflight = new Map<string, InFlightEntry<unknown>>();
  private recent = new Map<string, CacheEntry<unknown>>();
  private metrics = {
    inFlightCoalesced: 0,
    replayHits: 0,
    cacheStores: 0,
    tokensAvoided: 0,
    promptHashFrequency: new Map<string, number>(),
  };

  async run<T>(keyParts: PromptCacheKey, fn: () => Promise<T>, options: RunOptions): Promise<RunResult<T>> {
    const key = buildKey(keyParts);
    this.bumpFrequency(keyParts.promptHash);
    const ttl = options.replayTtlMs ?? DEFAULT_REPLAY_TTL;

    if (options.allowReplay) {
      const cached = this.recent.get(key);
      if (cached && Date.now() - cached.storedAt <= ttl) {
        this.metrics.replayHits += 1;
        if (options.estTokens) {
          this.metrics.tokensAvoided += options.estTokens;
        }
        return { status: 'replayed', value: cached.result };
      }
    }

    if (options.coalesceInFlight && this.inflight.has(key)) {
      const entry = this.inflight.get(key)!;
      return new Promise<RunResult<T>>((resolve, reject) => {
        entry.waiters.push((value: T) => {
          if (options.estTokens) {
            this.metrics.tokensAvoided += options.estTokens;
          }
          resolve({ status: 'coalesced', value });
        });
        entry.rejecters.push(reject);
        this.metrics.inFlightCoalesced += 1;
      });
    }

    const inflightEntry: InFlightEntry<T> = { waiters: [], rejecters: [] };
    this.inflight.set(key, inflightEntry);

    try {
      const value = await fn();
      if (options.allowReplay) {
        this.recent.set(key, { result: value, storedAt: Date.now(), estTokens: options.estTokens });
        this.metrics.cacheStores += 1;
      }
      inflightEntry.waiters.forEach((resolve) => resolve(value));
      return { status: 'fresh', value };
    } catch (error) {
      inflightEntry.rejecters.forEach((reject) => reject(error));
      throw error;
    } finally {
      this.inflight.delete(key);
    }
  }

  snapshotMetrics() {
    return {
      inFlightCoalesced: this.metrics.inFlightCoalesced,
      replayHits: this.metrics.replayHits,
      cacheStores: this.metrics.cacheStores,
      tokensAvoided: this.metrics.tokensAvoided,
      promptHashFrequency: new Map(this.metrics.promptHashFrequency),
    };
  }

  private bumpFrequency(hash: string) {
    const current = this.metrics.promptHashFrequency.get(hash) ?? 0;
    this.metrics.promptHashFrequency.set(hash, current + 1);
  }
}

export const promptCache = new PromptCache();
