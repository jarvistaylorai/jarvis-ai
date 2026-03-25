/**
 * Digest Mode
 * Aggregates repetitive status messages into concise updates
 */

import { MessageClassId } from './messageClasses';
import { render, renderTemplate, TemplateId } from './templates';

export interface DigestEntry {
  id: string;
  timestamp: number;
  messageClass: MessageClassId;
  content: string;
  context?: Record<string, unknown>;
  flushed: boolean;
}

export interface DigestBucket {
  key: string;
  entries: DigestEntry[];
  firstSeen: number;
  lastUpdated: number;
}

export interface DigestResult {
  content: string;
  tokenEstimate: number;
  entryCount: number;
  bucketKey: string;
}

export type DigestStrategy = 'immediate' | 'time_window' | 'count_threshold' | 'smart';

interface DigestConfig {
  strategy: DigestStrategy;
  timeWindowMs: number;
  countThreshold: number;
  maxBuckets: number;
}

const DEFAULT_CONFIG: DigestConfig = {
  strategy: 'smart',
  timeWindowMs: 5000, // 5 seconds
  countThreshold: 3,
  maxBuckets: 50,
};

class DigestCollector {
  private buckets = new Map<string, DigestBucket>();
  private config: DigestConfig;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<DigestConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startFlushTimer();
  }

  private startFlushTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flushExpiredBuckets();
    }, 1000);
  }

  private getBucketKey(messageClass: MessageClassId, context?: Record<string, unknown>): string {
    // Group by operation type + entity if available
    const entity = context?.entityId || context?.taskId || context?.agentId || 'general';
    const operation = context?.operation || 'unknown';
    return `${messageClass}:${operation}:${entity}`;
  }

  add(entry: Omit<DigestEntry, 'flushed'>): DigestEntry {
    const key = this.getBucketKey(entry.messageClass, entry.context);
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.config.maxBuckets) {
        // Evict oldest bucket
        const oldest = Array.from(this.buckets.entries()).sort(
          (a, b) => a[1].firstSeen - b[1].firstSeen
        )[0];
        if (oldest) {
          this.buckets.delete(oldest[0]);
        }
      }
      bucket = {
        key,
        entries: [],
        firstSeen: now,
        lastUpdated: now,
      };
      this.buckets.set(key, bucket);
    }

    const fullEntry: DigestEntry = { ...entry, flushed: false };
    bucket.entries.push(fullEntry);
    bucket.lastUpdated = now;

    // Check if we should flush immediately
    if (this.shouldFlush(bucket)) {
      this.flushBucket(key);
    }

    return fullEntry;
  }

  private shouldFlush(bucket: DigestBucket): boolean {
    const now = Date.now();

    switch (this.config.strategy) {
      case 'immediate':
        return true;
      case 'time_window':
        return now - bucket.firstSeen >= this.config.timeWindowMs;
      case 'count_threshold':
        return bucket.entries.length >= this.config.countThreshold;
      case 'smart':
      default:
        // Smart: flush on count threshold OR if time window exceeded with at least 2 entries
        if (bucket.entries.length >= this.config.countThreshold) return true;
        if (bucket.entries.length >= 2 && now - bucket.firstSeen >= this.config.timeWindowMs) {
          return true;
        }
        return false;
    }
  }

  flushBucket(key: string): DigestResult | null {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.entries.length === 0) return null;

    const result = this.compileBucket(bucket);
    bucket.entries.forEach((e) => (e.flushed = true));
    this.buckets.delete(key);
    return result;
  }

  flushExpiredBuckets(): DigestResult[] {
    const now = Date.now();
    const results: DigestResult[] = [];

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastUpdated >= this.config.timeWindowMs) {
        const result = this.flushBucket(key);
        if (result) results.push(result);
      }
    }

    return results;
  }

  private compileBucket(bucket: DigestBucket): DigestResult {
    const entries = bucket.entries;
    const messageClass = entries[0].messageClass;

    // Collapse similar entries
    const grouped = this.groupSimilarEntries(entries);

    let content: string;
    if (grouped.length === 1) {
      // Single group - use compact representation
      const group = grouped[0];
      content = this.renderGroup(group, messageClass);
    } else {
      // Multiple groups - aggregate
      content = grouped.map((g) => this.renderGroup(g, messageClass)).join(' | ');
    }

    return {
      content,
      tokenEstimate: Math.ceil(content.length / 4),
      entryCount: entries.length,
      bucketKey: bucket.key,
    };
  }

  private groupSimilarEntries(
    entries: DigestEntry[]
  ): { operation: string; count: number; latest: DigestEntry; context?: Record<string, unknown> }[] {
    const groups = new Map<string, { operation: string; entries: DigestEntry[] }>();

    for (const entry of entries) {
      const operation = String(entry.context?.operation || 'update');
      if (!groups.has(operation)) {
        groups.set(operation, { operation, entries: [] });
      }
      groups.get(operation)!.entries.push(entry);
    }

    return Array.from(groups.values()).map((g) => ({
      operation: g.operation,
      count: g.entries.length,
      latest: g.entries[g.entries.length - 1],
      context: g.entries[g.entries.length - 1].context,
    }));
  }

  private renderGroup(
    group: { operation: string; count: number; latest: DigestEntry; context?: Record<string, unknown> },
    messageClass: MessageClassId
  ): string {
    // Use template if available
    const operation = group.operation;
    const context = { ...group.context, count: group.count };

    // Try to find appropriate template
    let templateId: TemplateId | null = null;

    if (operation === 'progress' && context.progressPercent !== undefined) {
      templateId = 'status_progress';
    } else if (operation === 'complete') {
      templateId = 'completed_successfully';
    } else if (operation === 'partial_complete') {
      templateId = 'partial_completion';
    } else if (operation === 'error' || operation === 'failure') {
      templateId = 'error_with_code';
    }

    if (templateId && group.count === 1) {
      try {
        const rendered = renderTemplate(templateId, context);
        return rendered.content;
      } catch {
        // Fall through to default
      }
    }

    // Default: compact count notation
    const entity = context.taskId || context.agentId || 'item';
    if (group.count > 1) {
      return `${entity} ×${group.count} ${operation}`;
    }
    return `${entity} ${operation}`;
  }

  getPendingCount(): number {
    return Array.from(this.buckets.values()).reduce((sum, b) => sum + b.entries.length, 0);
  }

  flushAll(): DigestResult[] {
    const results: DigestResult[] = [];
    for (const key of this.buckets.keys()) {
      const result = this.flushBucket(key);
      if (result) results.push(result);
    }
    return results;
  }

  dispose() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// Global digest collector instance
let globalCollector: DigestCollector | null = null;

export function getDigestCollector(): DigestCollector {
  if (!globalCollector) {
    globalCollector = new DigestCollector();
  }
  return globalCollector;
}

export function resetDigestCollector(config?: Partial<DigestConfig>): DigestCollector {
  if (globalCollector) {
    globalCollector.dispose();
  }
  globalCollector = new DigestCollector(config);
  return globalCollector;
}

/**
 * High-level digest API for workflows
 */
export function emitDigest(
  messageClass: MessageClassId,
  content: string,
  context?: Record<string, unknown>
): DigestEntry {
  const collector = getDigestCollector();
  return collector.add({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    messageClass,
    content,
    context,
  });
}

/**
 * Flush pending digests and return compiled messages
 */
export function flushDigests(): DigestResult[] {
  return getDigestCollector().flushAll();
}

/**
 * Auto-digest wrapper for common patterns
 */
export function withDigest<T>(
  operation: string,
  entityId: string,
  fn: () => Promise<T>
): Promise<T> {
  const collector = getDigestCollector();

  emitDigest('status_update', `${operation} starting`, {
    operation: 'start',
    entityId,
  });

  const startTime = Date.now();

  return fn()
    .then((result) => {
      emitDigest('execution_result', `${operation} completed`, {
        operation: 'complete',
        entityId,
        elapsedMs: Date.now() - startTime,
      });
      return result;
    })
    .catch((error) => {
      emitDigest('error_recovery', `${operation} failed`, {
        operation: 'error',
        entityId,
        error: error.message,
      });
      throw error;
    });
}
