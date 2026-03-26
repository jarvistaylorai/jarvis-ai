export type BurstSource = 'cron' | 'agent' | 'multi';

interface SourceConfig {
  minSpacingMs: number;
  baseDelayMs: number;
  jitterMs: number;
  alwaysJitter?: boolean;
}

const SOURCE_CONFIG: Record<BurstSource, SourceConfig> = {
  cron: { minSpacingMs: 750, baseDelayMs: 250, jitterMs: 600, alwaysJitter: true },
  agent: { minSpacingMs: 250, baseDelayMs: 120, jitterMs: 220 },
  multi: { minSpacingMs: 400, baseDelayMs: 150, jitterMs: 400 },
};

const lastStart = new Map<string, number>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function applyBurstSmoothing(options: { source: BurstSource; key?: string }): Promise<void> {
  const config = SOURCE_CONFIG[options.source] ?? SOURCE_CONFIG.agent;
  const groupKey = `${options.source}:${options.key ?? 'global'}`;
  const now = Date.now();
  const last = lastStart.get(groupKey) ?? 0;
  const nextAllowed = last + config.minSpacingMs;
  const baseDelay = nextAllowed > now ? nextAllowed - now : 0;
  const jitter = config.jitterMs > 0 ? Math.random() * config.jitterMs : 0;
  const extra = baseDelay > 0 ? config.baseDelayMs : config.alwaysJitter ? config.baseDelayMs * Math.random() : 0;
  const totalDelay = baseDelay + extra + jitter;

  if (totalDelay > 5) {
    await sleep(totalDelay);
  }

  lastStart.set(groupKey, Date.now());
}
