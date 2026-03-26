type ModelId = 'google/gemini-3-pro' | 'openai/gpt-4o' | 'ollama/llama3.3';

const FALLBACK_CHAIN: ModelId[] = [
  'google/gemini-3-pro',
  'openai/gpt-4o',
  'ollama/llama3.3',
];

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

function providerAvailable(model: ModelId): boolean {
  if (model.startsWith('google/')) {
    return Boolean(process.env.GEMINI_API_KEY);
  }
  if (model.startsWith('openai/')) {
    return Boolean(process.env.OPENAI_API_KEY);
  }
  return true; // assume local/ollama always available
}

function resolveChain(preferred?: string): ModelId[] {
  if (!preferred) return FALLBACK_CHAIN;
  const normalized = preferred as ModelId;
  if (!FALLBACK_CHAIN.includes(normalized)) {
    return [normalized, ...FALLBACK_CHAIN];
  }
  const rest = FALLBACK_CHAIN.filter(m => m !== normalized);
  return [normalized, ...rest];
}

export async function executeWithModelFallback<T>(
  preferredModel: string | undefined,
  handler: (model: string) => Promise<T>
): Promise<FallbackResult<T>> {
  const chain = resolveChain(preferredModel);
  const attempts: AttemptLog[] = [];

  for (const model of chain) {
    if (!providerAvailable(model)) {
      attempts.push({ model, success: false, error: 'provider credentials missing' });
      continue;
    }

    try {
      const result = await handler(model);
      attempts.push({ model, success: true });
      console.log(`[ModelRouter] Using ${model}`);
      return { result, modelUsed: model, attempts };
    } catch (error: unknown) {
      const message = error?.message || String(error);
      attempts.push({ model, success: false, error: message });
      console.warn(`[ModelRouter] ${model} failed: ${message}`);
    }
  }

  throw new Error('[ModelRouter] All models failed');
}
