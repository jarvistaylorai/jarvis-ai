import { ProviderLimits, getProviderLimits, type PriorityLevel } from './providerLimits';
import type { Provider, RateLimiterMetadata } from './types';

interface TokenWindowEntry {
  timestamp: number;
  tokens: number;
}

interface ScheduledTask<T = unknown> {
  priority: PriorityLevel;
  estimatedTokens: number;
  runner: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  metadata?: RateLimiterMetadata;
  enqueuedAt: number;
  burstSensitive: boolean;
}

export interface ProviderPressure {
  score: number;
  rpmUsage: number;
  tpmUsage: number;
  concurrencyUsage: number;
  queueDepth: number;
  mode: OperatingMode;
  modeSource: ModeSource;
  overrideReason?: string;
  overrideExpiresAt?: number | null;
}

export interface RateLimiterMetricsSnapshot {
  waitTimes: Record<PriorityLevel, number[]>;
  retries: number;
  nearMisses: number;
}

interface ProviderState {
  limits: ProviderLimits;
  queues: Record<PriorityLevel, ScheduledTask[]>;
  processing: boolean;
  active: number;
  requestTimestamps: number[];
  tokenWindow: TokenWindowEntry[];
  pressure: ProviderPressure;
  modeOverride?: ModeOverride;
  metrics: {
    waitTimes: Record<PriorityLevel, number[]>;
    retries: number;
    nearMisses: number;
  };
}

const ONE_MINUTE = 60_000;
const PRIORITY_ORDER: PriorityLevel[] = ['P0', 'P1', 'P2', 'P3'];
const MODE_THRESHOLDS = {
  normal: 0.5,
  economy: 0.65,
  protection: 0.8,
  emergency: 0.92,
};

export type OperatingMode = 'normal' | 'economy' | 'protection' | 'emergency';
type ModeSource = 'auto' | 'provider-override' | 'global-override';

interface ModeOverride {
  mode: OperatingMode;
  reason?: string;
  expiresAt?: number;
  appliedAt: number;
}

interface ModeOverrideOptions {
  reason?: string;
  durationMs?: number;
  expiresAt?: number;
}

export interface RuntimeModeStatus {
  mode: OperatingMode;
  source: ModeSource;
  reason?: string;
  expiresAt?: number | null;
}

const MODE_RANK: Record<OperatingMode, number> = {
  normal: 0,
  economy: 1,
  protection: 2,
  emergency: 3,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class RateLimiter {
  private states = new Map<Provider, ProviderState>();
  private globalOverride?: ModeOverride;

  private getState(provider: Provider): ProviderState {
    if (!this.states.has(provider)) {
      const limits = getProviderLimits(provider);
      this.states.set(provider, {
        limits,
        queues: {
          P0: [],
          P1: [],
          P2: [],
          P3: [],
        },
        processing: false,
        active: 0,
        requestTimestamps: [],
        tokenWindow: [],
        pressure: {
          score: 0,
          rpmUsage: 0,
          tpmUsage: 0,
          concurrencyUsage: 0,
          queueDepth: 0,
          mode: 'normal',
          modeSource: 'auto',
          overrideReason: undefined,
          overrideExpiresAt: null,
        },
        metrics: {
          waitTimes: { P0: [], P1: [], P2: [], P3: [] },
          retries: 0,
          nearMisses: 0,
        },
      });
    }
    return this.states.get(provider)!;
  }

  async schedule<T>(
    provider: Provider,
    estimatedTokens: number,
    runner: () => Promise<T>,
    metadata?: RateLimiterMetadata,
    options?: { priority?: PriorityLevel; burstSensitive?: boolean }
  ): Promise<T> {
    const state = this.getState(provider);
    const priority = options?.priority ?? 'P1';
    const bufferedTokens = Math.ceil(
      estimatedTokens * (state.limits.safetyMultiplier ?? 1.0)
    );

    return new Promise<T>((resolve, reject) => {
      const task: ScheduledTask = {
        priority,
        estimatedTokens: bufferedTokens,
        runner,
        resolve,
        reject,
        metadata,
        enqueuedAt: Date.now(),
        burstSensitive: options?.burstSensitive ?? priority !== 'P0',
      };

      state.queues[priority].push(task);
      this.processNext(provider);
    });
  }

  getPressure(provider: Provider): ProviderPressure {
    return this.getState(provider).pressure;
  }

  getMetrics(provider: Provider): RateLimiterMetricsSnapshot {
    const state = this.getState(provider);
    return {
      waitTimes: {
        P0: [...state.metrics.waitTimes.P0],
        P1: [...state.metrics.waitTimes.P1],
        P2: [...state.metrics.waitTimes.P2],
        P3: [...state.metrics.waitTimes.P3],
      },
      retries: state.metrics.retries,
      nearMisses: state.metrics.nearMisses,
    };
  }

  private processNext(provider: Provider) {
    const state = this.getState(provider);
    if (state.processing) {
      return;
    }

    const nextTask = this.dequeue(state);
    if (!nextTask) {
      return;
    }

    state.processing = true;
    this.executeTask(provider, state, nextTask)
      .catch((err) => {
        console.error('[RateLimiter] Task failed', err);
        nextTask.reject(err);
      })
      .finally(() => {
        state.processing = false;
        this.processNext(provider);
      });
  }

  private dequeue(state: ProviderState): ScheduledTask | undefined {
    for (const priority of PRIORITY_ORDER) {
      if (state.pressure.mode === 'protection' && priority === 'P3') continue;
      if (state.pressure.mode === 'emergency' && (priority === 'P2' || priority === 'P3')) continue;
      const queue = state.queues[priority];
      if (queue.length > 0) {
        const task = queue.shift();
        if (task) {
          const wait = Date.now() - task.enqueuedAt;
          state.metrics.waitTimes[priority].push(wait);
          return task;
        }
      }
    }
    return undefined;
  }

  private async executeTask(provider: Provider, state: ProviderState, task: ScheduledTask) {
    await this.waitForSlot(state, task.estimatedTokens, task.metadata);

    if (task.burstSensitive && state.pressure.mode !== 'normal') {
      const jitter = (state.limits.burstJitterMs ?? 150) * Math.random();
      await sleep(jitter);
    }

    state.active += 1;
    try {
      const result = await this.runWithRetry(provider, state, task);
      task.resolve(result);
    } finally {
      state.active = Math.max(0, state.active - 1);
    }
  }

  private async runWithRetry<T>(provider: Provider, state: ProviderState, task: ScheduledTask<T>): Promise<T> {
    const retryCfg = state.limits.retry;
    const maxAttempts = retryCfg?.maxAttemptsByPriority?.[task.priority] ?? 1;
    const baseDelay = retryCfg?.baseDelayMs ?? 250;
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxAttempts) {
      try {
        return await task.runner();
      } catch (error: unknown) {
        lastError = error;
        if (!this.isRetryable(error) || attempt === maxAttempts) {
          throw error;
        }
        state.metrics.retries += 1;
        const backoff = baseDelay * Math.pow(2, attempt) + Math.random() * baseDelay;
        await sleep(backoff);
        attempt += 1;
      }
    }

    throw lastError;
  }

  private isRetryable(error: unknown): boolean {
    if (error?.retryable === false) return false;
    if (error?.code && ['context_length_exceeded', 'invalid_request'].includes(error.code)) {
      return false;
    }
    const message = error?.message?.toLowerCase?.() || '';
    if (message.includes('authentication') || message.includes('invalid api key')) {
      return false;
    }
    return true;
  }

  private async waitForSlot(
    state: ProviderState,
    tokensRequested: number,
    metadata?: RateLimiterMetadata
  ): Promise<void> {
    while (true) {
      const now = Date.now();
      this.trimWindows(state, now);

      const rpmUsage = state.requestTimestamps.length / state.limits.rpm;
      const tokensInWindow = state.tokenWindow.reduce((sum, entry) => sum + entry.tokens, 0);
      const tpmUsage = tokensInWindow / state.limits.tpm;
      const concurrencyUsage = state.active / state.limits.concurrency;
      const queueDepth = this.queueDepth(state);
      const score = this.computePressureScore(rpmUsage, tpmUsage, concurrencyUsage, queueDepth);
      const scoreMode = this.modeFromScore(score);
      const headroomMode = this.modeFromHeadroom(rpmUsage, tpmUsage, concurrencyUsage, state.limits);
      const computedMode = this.maxMode(scoreMode, headroomMode);
      const resolvedMode = this.resolveOperatingMode(state, computedMode);
      state.pressure = {
        score,
        rpmUsage,
        tpmUsage,
        concurrencyUsage,
        queueDepth,
        mode: resolvedMode.mode,
        modeSource: resolvedMode.source,
        overrideReason: resolvedMode.override?.reason,
        overrideExpiresAt: resolvedMode.override?.expiresAt ?? null,
      };

      const rpmHeadroom = state.limits.headroom || { soft: 0.65, high: 0.8, emergency: 0.9 };
      const rpmSafe = rpmUsage < rpmHeadroom.emergency;
      const tpmSafe = tpmUsage + tokensRequested / state.limits.tpm < rpmHeadroom.emergency;
      const concurrencySafe = concurrencyUsage < 1;

      if (rpmSafe && tpmSafe && concurrencySafe) {
        state.requestTimestamps.push(now);
        state.tokenWindow.push({ timestamp: now, tokens: tokensRequested });
        return;
      }

      state.metrics.nearMisses += 1;
      const waitFor = this.computeBackoffDelay(state, rpmUsage, tpmUsage, concurrencyUsage);
      if (waitFor > 250) {
        const context = metadata?.requestId || metadata?.agentId || metadata?.model || 'unknown';
        console.warn(
          `[RateLimiter] throttling ${context} (${waitFor}ms) pressure=${score.toFixed(2)} mode=${resolvedMode.mode}`
        );
      }
      await sleep(waitFor);
    }
  }

  private computeBackoffDelay(
    state: ProviderState,
    rpmUsage: number,
    tpmUsage: number,
    concurrencyUsage: number
  ): number {
    const severity = Math.max(rpmUsage, tpmUsage, concurrencyUsage);
    const jitter = Math.random() * 50;
    if (severity > 0.95) return 1000 + jitter;
    if (severity > 0.85) return 500 + jitter;
    if (severity > 0.7) return 250 + jitter;
    return 125 + jitter;
  }

  private queueDepth(state: ProviderState): number {
    return PRIORITY_ORDER.reduce((sum, priority) => sum + state.queues[priority].length, 0);
  }

  private computePressureScore(
    rpmUsage: number,
    tpmUsage: number,
    concurrencyUsage: number,
    queueDepth: number
  ): number {
    const queueScore = Math.min(1, queueDepth / 20);
    return Number(((rpmUsage + tpmUsage + concurrencyUsage + queueScore) / 4).toFixed(3));
  }

  private modeFromScore(score: number): OperatingMode {
    if (score >= MODE_THRESHOLDS.emergency) return 'emergency';
    if (score >= MODE_THRESHOLDS.protection) return 'protection';
    if (score >= MODE_THRESHOLDS.economy) return 'economy';
    return 'normal';
  }

  private modeFromHeadroom(
    rpmUsage: number,
    tpmUsage: number,
    concurrencyUsage: number,
    limits: ProviderLimits
  ): OperatingMode {
    const headroom = limits.headroom || { soft: 0.65, high: 0.8, emergency: 0.9 };
    const metrics = [rpmUsage, tpmUsage, concurrencyUsage];
    if (metrics.some((value) => value >= headroom.emergency)) return 'emergency';
    if (metrics.some((value) => value >= headroom.high)) return 'protection';
    if (metrics.some((value) => value >= headroom.soft)) return 'economy';
    return 'normal';
  }

  private maxMode(a: OperatingMode, b: OperatingMode): OperatingMode {
    return MODE_RANK[a] >= MODE_RANK[b] ? a : b;
  }

  private trimWindows(state: ProviderState, now: number) {
    state.requestTimestamps = state.requestTimestamps.filter(
      (timestamp) => now - timestamp < ONE_MINUTE
    );
    state.tokenWindow = state.tokenWindow.filter(
      (entry) => now - entry.timestamp < ONE_MINUTE
    );
  }

  private resolveOperatingMode(state: ProviderState, computed: OperatingMode) {
    const providerOverride = this.getProviderOverride(state);
    if (providerOverride) {
      return { mode: providerOverride.mode, source: 'provider-override' as ModeSource, override: providerOverride };
    }
    const globalOverride = this.getGlobalOverride();
    if (globalOverride) {
      return { mode: globalOverride.mode, source: 'global-override' as ModeSource, override: globalOverride };
    }
    return { mode: computed, source: 'auto' as ModeSource, override: undefined };
  }

  private getProviderOverride(state: ProviderState): ModeOverride | undefined {
    if (!state.modeOverride) return undefined;
    if (state.modeOverride.expiresAt && state.modeOverride.expiresAt <= Date.now()) {
      state.modeOverride = undefined;
      return undefined;
    }
    return state.modeOverride;
  }

  private getGlobalOverride(): ModeOverride | undefined {
    if (!this.globalOverride) return undefined;
    if (this.globalOverride.expiresAt && this.globalOverride.expiresAt <= Date.now()) {
      this.globalOverride = undefined;
      return undefined;
    }
    return this.globalOverride;
  }

  private buildOverride(mode: OperatingMode, options?: ModeOverrideOptions): ModeOverride {
    const expiresAt = options?.expiresAt ?? (options?.durationMs ? Date.now() + options.durationMs : undefined);
    return {
      mode,
      reason: options?.reason,
      expiresAt,
      appliedAt: Date.now(),
    };
  }

  setModeOverride(provider: Provider, mode: OperatingMode, options?: ModeOverrideOptions) {
    const state = this.getState(provider);
    state.modeOverride = this.buildOverride(mode, options);
  }

  clearModeOverride(provider?: Provider) {
    if (provider) {
      const target = this.states.get(provider);
      if (target) {
        target.modeOverride = undefined;
      }
      return;
    }
    for (const [, state] of this.states.entries()) {
      state.modeOverride = undefined;
    }
  }

  setGlobalMode(mode: OperatingMode, options?: ModeOverrideOptions) {
    this.globalOverride = this.buildOverride(mode, options);
  }

  clearGlobalMode() {
    this.globalOverride = undefined;
  }

  getModeStatus(provider: Provider): RuntimeModeStatus {
    const state = this.getState(provider);
    const resolved = this.resolveOperatingMode(state, state.pressure.mode);
    return {
      mode: resolved.mode,
      source: resolved.source,
      reason: resolved.override?.reason,
      expiresAt: resolved.override?.expiresAt ?? null,
    };
  }
}

export const globalRateLimiter = new RateLimiter();

export interface RuntimeModeOptions {
  provider?: Provider;
  reason?: string;
  durationMs?: number;
  expiresAt?: number;
}

export function setRuntimeMode(mode: OperatingMode, options?: RuntimeModeOptions) {
  const overrideOptions: ModeOverrideOptions | undefined = options
    ? {
        reason: options.reason,
        durationMs: options.durationMs,
        expiresAt: options.expiresAt,
      }
    : undefined;

  if (options?.provider) {
    globalRateLimiter.setModeOverride(options.provider, mode, overrideOptions);
  } else {
    globalRateLimiter.setGlobalMode(mode, overrideOptions);
  }
}

export function clearRuntimeMode(options?: { provider?: Provider }) {
  if (options?.provider) {
    globalRateLimiter.clearModeOverride(options.provider);
  } else {
    globalRateLimiter.clearGlobalMode();
    globalRateLimiter.clearModeOverride();
  }
}

export function getRuntimeMode(provider: Provider): RuntimeModeStatus {
  return globalRateLimiter.getModeStatus(provider);
}
