type ModelId = string;

const ENV_FALLBACK = (process.env.OPENROUTER_FALLBACK_CHAIN || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const FALLBACK_CHAIN: ModelId[] = ENV_FALLBACK.length > 0 ? ENV_FALLBACK : [process.env.OPENROUTER_DEFAULT_MODEL || 'openrouter/auto'];

type AttemptLog = {
  model: string;
  success: boolean;
  error?: string;
};

type FallbackResult<T> = {
  result: T;
  modelUsed: string;
  attempts: AttemptLog[];
};

function providerAvailable(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function resolveChain(preferred?: string, overrides?: string[]): ModelId[] {
  const baseChain = overrides && overrides.length > 0 ? overrides : FALLBACK_CHAIN;
  if (!preferred) return baseChain;

  const normalized = preferred as ModelId;
  if (!baseChain.includes(normalized)) {
    return [normalized, ...baseChain];
  }
  const rest = baseChain.filter((model) => model !== normalized);
  return [normalized, ...rest];
}

export async function executeWithModelFallback<T>(
  preferredModel: string | undefined,
  handler: (model: string) => Promise<T>,
  options?: { fallbackChain?: string[] }
): Promise<FallbackResult<T>> {
  const chain = resolveChain(preferredModel, options?.fallbackChain);
  const attempts: AttemptLog[] = [];

  for (const model of chain) {
    if (!providerAvailable()) {
      attempts.push({ model, success: false, error: 'openrouter credentials missing' });
      continue;
    }

    try {
      const result = await handler(model);
      attempts.push({ model, success: true });
      console.log(`[ModelRouter] Using ${model}`);
      return { result, modelUsed: model, attempts };
    } catch (error: unknown) {
      const message = (error as Error)?.message || String(error);
      attempts.push({ model, success: false, error: message });
      console.warn(`[ModelRouter] ${model} failed: ${message}`);
    }
  }

  throw new Error('[ModelRouter] All models failed');
}
