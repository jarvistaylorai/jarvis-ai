type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool' | string;
  content: string;
};

interface ChatCompletionPayload {
  model: string;
  messages: ChatMessage[];
  tools?: unknown[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

interface OpenRouterMetadata {
  provider: 'openrouter';
  model?: string | null;
  tokensInput?: number;
  tokensOutput?: number;
  tokensTotal?: number;
  cost?: number;
  processingMs?: number;
}

interface OpenRouterResponse<T = unknown> {
  id: string;
  choices: Array<{
    message: ChatMessage & { tool_calls?: unknown[] };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  metadata?: OpenRouterMetadata & T;
}

const RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class OpenRouterClient {
  private readonly apiKey = process.env.OPENROUTER_API_KEY;
  private readonly baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  private readonly referer = process.env.OPENROUTER_SITE_URL || 'https://mission-control.local';
  private readonly appName = process.env.OPENROUTER_APP_NAME || 'Jarvis Mission Control';
  private readonly maxAttempts = Number(process.env.OPENROUTER_MAX_ATTEMPTS ?? 3);
  private readonly baseDelay = Number(process.env.OPENROUTER_RETRY_DELAY_MS ?? 600);

  constructor() {
    if (!this.apiKey) {
      console.warn('[OpenRouter] OPENROUTER_API_KEY is not set. LLM calls will fail until it is configured.');
    }
  }

  async chatCompletionsCreate(payload: ChatCompletionPayload): Promise<OpenRouterResponse> {
    if (!this.apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY environment variable');
    }

    const url = `${this.baseUrl}/chat/completions`;
    const headers = new Headers({
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.referer,
      'X-Title': this.appName,
    });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = (await response.json()) as OpenRouterResponse;
        data.metadata = this.buildMetadata(response);
        return data;
      }

      const retryable = RETRYABLE_STATUSES.has(response.status);
      const errorPayload = await this.safeParseError(response);
      const error = new Error(
        `[OpenRouter] ${response.status} ${response.statusText}: ${errorPayload?.message || errorPayload?.error || 'Unknown error'}`
      ) as Error & { retryable?: boolean; code?: string };
      error.retryable = retryable;
      error.code = errorPayload?.code;
      lastError = error;

      if (!retryable || attempt === this.maxAttempts - 1) {
        throw error;
      }

      const backoff = this.baseDelay * Math.pow(2, attempt) + Math.random() * 125;
      await sleep(backoff);
    }

    throw lastError ?? new Error('OpenRouter request failed');
  }

  private buildMetadata(response: Response): OpenRouterMetadata {
    return {
      provider: 'openrouter',
      model: response.headers.get('x-openrouter-model'),
      tokensInput: this.parseHeaderInt(response.headers.get('x-openrouter-tokens-input')),
      tokensOutput: this.parseHeaderInt(response.headers.get('x-openrouter-tokens-output')),
      tokensTotal: this.parseHeaderInt(response.headers.get('x-openrouter-tokens-total')),
      cost: this.parseHeaderFloat(response.headers.get('x-openrouter-cost')),
      processingMs: this.parseHeaderInt(response.headers.get('x-openrouter-processing-ms')),
    };
  }

  private parseHeaderInt(value: string | null): number | undefined {
    if (!value) return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }

  private parseHeaderFloat(value: string | null): number | undefined {
    if (!value) return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }

  private async safeParseError(response: Response): Promise<{ message?: string; code?: string } | null> {
    try {
      return await response.json();
    } catch {
      try {
        const text = await response.text();
        return text ? { message: text } : null;
      } catch {
        return null;
      }
    }
  }
}

const client = new OpenRouterClient();

export const openclaw = {
  chat: {
    completions: {
      create: (payload: ChatCompletionPayload) => client.chatCompletionsCreate(payload),
    },
  },
};

export type OpenRouterClientType = typeof openclaw;
