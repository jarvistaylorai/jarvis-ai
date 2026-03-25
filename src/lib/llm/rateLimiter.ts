import { ProviderLimits, getProviderLimits } from './providerLimits';
import type { Provider, RateLimiterMetadata } from './types';

interface TokenWindowEntry {
  timestamp: number;
  tokens: number;
}

interface ProviderState {
  limits: ProviderLimits;
  queue: Array<() => Promise<void>>;
  processing: boolean;
  active: number;
  requestTimestamps: number[];
  tokenWindow: TokenWindowEntry[];
}

const ONE_MINUTE = 60_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class RateLimiter {
  private states = new Map<Provider, ProviderState>();

  private getState(provider: Provider): ProviderState {
    if (!this.states.has(provider)) {
      this.states.set(provider, {
        limits: getProviderLimits(provider),
        queue: [],
        processing: false,
        active: 0,
        requestTimestamps: [],
        tokenWindow: [],
      });
    }
    return this.states.get(provider)!;
  }

  async schedule<T>(
    provider: Provider,
    estimatedTokens: number,
    runner: () => Promise<T>,
    metadata?: RateLimiterMetadata
  ): Promise<T> {
    const state = this.getState(provider);

    const bufferedTokens = Math.ceil(
      estimatedTokens * (state.limits.safetyMultiplier ?? 1.0)
    );

    return new Promise<T>((resolve, reject) => {
      const task = async () => {
        try {
          await this.waitForSlot(state, bufferedTokens, metadata);
          state.active += 1;
          const result = await runner();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          state.active = Math.max(0, state.active - 1);
          this.processNext(provider);
        }
      };

      state.queue.push(task);
      this.processNext(provider);
    });
  }

  private processNext(provider: Provider) {
    const state = this.getState(provider);
    if (state.processing) {
      return;
    }

    const next = state.queue.shift();
    if (!next) {
      return;
    }

    state.processing = true;
    next()
      .catch((err) => {
        console.error('[RateLimiter] Task failed', err);
      })
      .finally(() => {
        state.processing = false;
        if (state.queue.length > 0) {
          this.processNext(provider);
        }
      });
  }

  private async waitForSlot(
    state: ProviderState,
    tokensRequested: number,
    metadata?: RateLimiterMetadata
  ): Promise<void> {
    while (true) {
      const now = Date.now();
      this.trimWindows(state, now);

      const canIssueRequest =
        state.requestTimestamps.length < state.limits.rpm;
      const tokensInWindow = state.tokenWindow.reduce(
        (sum, entry) => sum + entry.tokens,
        0
      );
      const hasTokenBudget =
        tokensInWindow + tokensRequested <= state.limits.tpm;
      const hasConcurrency = state.active < state.limits.concurrency;

      if (canIssueRequest && hasTokenBudget && hasConcurrency) {
        state.requestTimestamps.push(now);
        state.tokenWindow.push({ timestamp: now, tokens: tokensRequested });
        return;
      }

      const waitDurations: number[] = [];
      if (!canIssueRequest && state.requestTimestamps.length > 0) {
        const oldest = state.requestTimestamps[0];
        waitDurations.push(oldest + ONE_MINUTE - now);
      }
      if (!hasTokenBudget && state.tokenWindow.length > 0) {
        const oldestToken = state.tokenWindow[0];
        waitDurations.push(oldestToken.timestamp + ONE_MINUTE - now);
      }
      if (!hasConcurrency) {
        waitDurations.push(50);
      }

      const waitFor = Math.max(25, Math.min(...waitDurations));
      if (waitFor > 250) {
        const context =
          metadata?.requestId || metadata?.agentId || metadata?.model || 'unknown';
        console.warn(
          `[RateLimiter] throttling ${context} (${waitFor}ms) [rpm:${canIssueRequest} tpm:${hasTokenBudget} concurrency:${hasConcurrency}]`
        );
      }
      await sleep(waitFor);
    }
  }

  private trimWindows(state: ProviderState, now: number) {
    state.requestTimestamps = state.requestTimestamps.filter(
      (timestamp) => now - timestamp < ONE_MINUTE
    );
    state.tokenWindow = state.tokenWindow.filter(
      (entry) => now - entry.timestamp < ONE_MINUTE
    );
  }
}

export const globalRateLimiter = new RateLimiter();
