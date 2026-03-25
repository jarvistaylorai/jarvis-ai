import type { Provider } from './types';

export interface ProviderLimits {
  /** Maximum requests per minute allowed by the upstream provider */
  rpm: number;
  /** Maximum tokens per minute allowed by the upstream provider */
  tpm: number;
  /** Concurrent in-flight requests allowed for the provider */
  concurrency: number;
  /** Additional buffer multiplier applied to token estimates (default 1.0). */
  safetyMultiplier?: number;
}

const FALLBACK_LIMITS: ProviderLimits = {
  rpm: 5,
  tpm: 300_000,
  concurrency: 2,
  safetyMultiplier: 1.0,
};

const BASE_LIMITS: Record<Provider, ProviderLimits> = {
  openai: {
    rpm: Number(process.env.OPENAI_RPM_LIMIT ?? 5),
    tpm: Number(process.env.OPENAI_TPM_LIMIT ?? 300_000),
    concurrency: Number(process.env.OPENAI_CONCURRENCY_LIMIT ?? 2),
    safetyMultiplier: Number(process.env.OPENAI_TOKEN_SAFETY ?? 1.1),
  },
  anthropic: {
    rpm: Number(process.env.ANTHROPIC_RPM_LIMIT ?? 4),
    tpm: Number(process.env.ANTHROPIC_TPM_LIMIT ?? 200_000),
    concurrency: Number(process.env.ANTHROPIC_CONCURRENCY_LIMIT ?? 2),
    safetyMultiplier: Number(process.env.ANTHROPIC_TOKEN_SAFETY ?? 1.05),
  },
  google: {
    rpm: Number(process.env.GOOGLE_RPM_LIMIT ?? 6),
    tpm: Number(process.env.GOOGLE_TPM_LIMIT ?? 450_000),
    concurrency: Number(process.env.GOOGLE_CONCURRENCY_LIMIT ?? 3),
    safetyMultiplier: Number(process.env.GOOGLE_TOKEN_SAFETY ?? 1.05),
  },
  ollama: {
    rpm: Number(process.env.OLLAMA_RPM_LIMIT ?? 20),
    tpm: Number(process.env.OLLAMA_TPM_LIMIT ?? 999_999),
    concurrency: Number(process.env.OLLAMA_CONCURRENCY_LIMIT ?? 4),
    safetyMultiplier: Number(process.env.OLLAMA_TOKEN_SAFETY ?? 1.0),
  },
};

export function getProviderLimits(provider: Provider): ProviderLimits {
  return BASE_LIMITS[provider] ?? FALLBACK_LIMITS;
}
