export type Provider = 'openai' | 'anthropic' | 'google' | 'ollama' | string;

export interface RateLimiterMetadata {
  requestId?: string;
  model?: string;
  agentId?: string;
}
