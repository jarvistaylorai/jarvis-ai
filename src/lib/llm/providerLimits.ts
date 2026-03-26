import type { Provider } from './types';

export type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3';

export interface ProviderLimits {
  /** Maximum requests per minute allowed by the upstream provider */
  rpm: number;
  /** Maximum tokens per minute allowed by the upstream provider */
  tpm: number;
  /** Concurrent in-flight requests allowed for the provider */
  concurrency: number;
  /** Additional buffer multiplier applied to token estimates (default 1.0). */
  safetyMultiplier?: number;
  /** Utilization headroom thresholds (0-1) for soft/high/emergency modes */
  headroom?: {
    soft: number;
    high: number;
    emergency: number;
  };
  /** Maximum jitter to apply (ms) for burst smoothing */
  burstJitterMs?: number;
  /** Priority weights controlling queue fairness */
  priorityWeights?: Record<PriorityLevel, number>;
  /** Retry budgets per priority */
  retry?: {
    maxAttemptsByPriority: Record<PriorityLevel, number>;
    baseDelayMs: number;
  };
}

const DEFAULT_HEADROOM = {
  soft: 0.65,
  high: 0.8,
  emergency: 0.9,
};

const DEFAULT_PRIORITY_WEIGHTS: Record<PriorityLevel, number> = {
  P0: 1,
  P1: 0.8,
  P2: 0.5,
  P3: 0.2,
};

const DEFAULT_RETRIES = {
  maxAttemptsByPriority: {
    P0: 3,
    P1: 2,
    P2: 1,
    P3: 0,
  },
  baseDelayMs: 250,
};

const FALLBACK_LIMITS: ProviderLimits = {
  rpm: 5,
  tpm: 300_000,
  concurrency: 2,
  safetyMultiplier: 1.0,
  headroom: DEFAULT_HEADROOM,
  burstJitterMs: 150,
  priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
  retry: DEFAULT_RETRIES,
};

const BASE_LIMITS: Record<Provider, ProviderLimits> = {
  openai: {
    rpm: Number(process.env.OPENAI_RPM_LIMIT ?? 5),
    tpm: Number(process.env.OPENAI_TPM_LIMIT ?? 300_000),
    concurrency: Number(process.env.OPENAI_CONCURRENCY_LIMIT ?? 2),
    safetyMultiplier: Number(process.env.OPENAI_TOKEN_SAFETY ?? 1.1),
    headroom: DEFAULT_HEADROOM,
    burstJitterMs: 200,
    priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
    retry: DEFAULT_RETRIES,
  },
  anthropic: {
    rpm: Number(process.env.ANTHROPIC_RPM_LIMIT ?? 4),
    tpm: Number(process.env.ANTHROPIC_TPM_LIMIT ?? 200_000),
    concurrency: Number(process.env.ANTHROPIC_CONCURRENCY_LIMIT ?? 2),
    safetyMultiplier: Number(process.env.ANTHROPIC_TOKEN_SAFETY ?? 1.05),
    headroom: DEFAULT_HEADROOM,
    burstJitterMs: 250,
    priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
    retry: DEFAULT_RETRIES,
  },
  google: {
    rpm: Number(process.env.GOOGLE_RPM_LIMIT ?? 6),
    tpm: Number(process.env.GOOGLE_TPM_LIMIT ?? 450_000),
    concurrency: Number(process.env.GOOGLE_CONCURRENCY_LIMIT ?? 3),
    safetyMultiplier: Number(process.env.GOOGLE_TOKEN_SAFETY ?? 1.05),
    headroom: DEFAULT_HEADROOM,
    burstJitterMs: 200,
    priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
    retry: DEFAULT_RETRIES,
  },
  ollama: {
    rpm: Number(process.env.OLLAMA_RPM_LIMIT ?? 20),
    tpm: Number(process.env.OLLAMA_TPM_LIMIT ?? 999_999),
    concurrency: Number(process.env.OLLAMA_CONCURRENCY_LIMIT ?? 4),
    safetyMultiplier: Number(process.env.OLLAMA_TOKEN_SAFETY ?? 1.0),
    headroom: DEFAULT_HEADROOM,
    burstJitterMs: 100,
    priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
    retry: DEFAULT_RETRIES,
  },
};

export function getProviderLimits(provider: Provider): ProviderLimits {
  return BASE_LIMITS[provider] ?? FALLBACK_LIMITS;
}
