import { PrismaClient } from '@prisma/client';
import { calculateCost } from '@/lib/costs/modelPricing';
import { estimateTokens } from '@/lib/context/budgetEnforcer';
import { globalRateLimiter } from '@/lib/llm/rateLimiter';
import { render as renderTemplate } from '@/lib/messaging/templates';
import type { Provider } from '@/lib/llm/types';
import type { MessageClassId } from '@/lib/messaging/messageClasses';
import { getOutputTokenLimit, guardInternalContent, shouldUseTemplate } from '@/lib/messaging/policy';
import { promptCache, type DuplicateStatus } from '@/lib/llm/promptCache';
import { normalizeBlock, hashNormalized, type PromptFingerprints } from '@/lib/context/promptFingerprint';

const prisma = new PrismaClient();

const MODEL_DOWNGRADE_MAP: Record<string, string> = {
  'openai/gpt-4o': 'openai/gpt-4o-mini',
  'openai/gpt-4.1': 'openai/gpt-4o-mini',
  'openai/gpt-4': 'openai/gpt-4o-mini',
  'claude-3.7-opus': 'claude-3.7-sonnet',
  'claude-3.7-sonnet': 'claude-3-haiku',
  'gemini-1.5-pro': 'gemini-1.5-flash',
};

const OUTPUT_TOKEN_BUFFER = Number(process.env.LLM_OUTPUT_TOKEN_BUFFER ?? 1500);
const DEFAULT_AGENT_CAP = Number(process.env.LLM_DEFAULT_AGENT_CAP ?? 10);
const GLOBAL_DAILY_CAP = process.env.LLM_GLOBAL_DAILY_CAP
  ? Number(process.env.LLM_GLOBAL_DAILY_CAP)
  : Infinity;
const AGENT_DEGRADE_THRESHOLD = Number(
  process.env.LLM_AGENT_DEGRADE_THRESHOLD ?? 0.8
);
const GLOBAL_DEGRADE_THRESHOLD = Number(
  process.env.LLM_GLOBAL_DEGRADE_THRESHOLD ?? 0.85
);

function inferProviderFromModel(model: string, fallback: Provider): Provider {
  if (model.startsWith('openai/')) return 'openai';
  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('gemini')) return 'google';
  if (model.startsWith('kimi')) return 'ollama';
  return fallback;
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

// Base call options without message class
interface BaseCallOptions {
  model: string;
  provider: Provider;
  agent_id: string;
  task_id?: string;
  project_id?: string;
  prompt: string;
}

// Extended options with message class discipline
interface CallWithDisciplineOptions extends BaseCallOptions {
  messageClass?: MessageClassId;
  operationTemplate?: string;
  templateValues?: Record<string, string | number | undefined>;
  preferTemplate?: boolean;
  fingerprints?: PromptFingerprints;
  allowCachedResponse?: boolean;
  toolStateHash?: string;
}

// This is the legacy wrapper for backward compatibility
export async function callModelWithTracking({
  model,
  provider,
  agent_id,
  task_id,
  project_id,
  prompt,
}: BaseCallOptions) {
  // Delegate to disciplined version without message class
  return callModelWithDiscipline({
    model,
    provider,
    agent_id,
    task_id,
    project_id,
    prompt,
  });
}

// New disciplined call with message class support
export async function callModelWithDiscipline({
  model,
  provider,
  agent_id,
  task_id,
  project_id,
  prompt,
  messageClass,
  operationTemplate,
  templateValues,
  preferTemplate = true,
  fingerprints,
  allowCachedResponse = false,
  toolStateHash,
}: CallWithDisciplineOptions) {
  // 1. BUDGET ENFORCEMENT
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [agentSpendAggregate, globalSpendAggregate, limits] = await Promise.all([
    prisma.spendLog.aggregate({
      _sum: { cost: true },
      where: { agent_id, created_at: { gte: todayStart } },
    }),
    prisma.spendLog.aggregate({
      _sum: { cost: true },
      where: { created_at: { gte: todayStart } },
    }),
    prisma.spendLimit.findUnique({ where: { id: 'global' } }),
  ]);

  const agentSpendToday = Number(agentSpendAggregate._sum?.cost ?? 0);
  const globalSpendToday = Number(globalSpendAggregate._sum?.cost ?? 0);
  const agentLimit = limits?.per_agent_limit ?? DEFAULT_AGENT_CAP;

  if (agentSpendToday >= agentLimit) {
    throw new Error(
      `Budget Exceeded: Agent ${agent_id} consumed ${formatCurrency(agentSpendToday)} (cap ${formatCurrency(
        agentLimit
      )}).`
    );
  }

  if (GLOBAL_DAILY_CAP !== Infinity && globalSpendToday >= GLOBAL_DAILY_CAP) {
    throw new Error(
      `Global LLM cap hit: ${formatCurrency(globalSpendToday)} / ${formatCurrency(
        GLOBAL_DAILY_CAP
      )}.`
    );
  }

  // 2. MODEL SELECTION & DEGRADATION
  const runtimeNotices: string[] = [];
  let selectedModel = model;
  let selectedProvider: Provider = provider;

  const agentUtilization = agentSpendToday / agentLimit;
  const globalUtilization =
    GLOBAL_DAILY_CAP === Infinity ? 0 : globalSpendToday / GLOBAL_DAILY_CAP;

  const maybeDowngrade = (reason: string) => {
    const downgraded = MODEL_DOWNGRADE_MAP[selectedModel];
    if (!downgraded || downgraded === selectedModel) return;
    
    // Use template for downgrade notification if available
    const notice = operationTemplate && templateValues
      ? renderTemplate.downgradedModel({
          ...templateValues,
          fromModel: selectedModel,
          toModel: downgraded,
        }).content
      : `↓ Budget cap: ${selectedModel} → ${downgraded}`;
    
    runtimeNotices.push(notice);
    selectedModel = downgraded;
    selectedProvider = inferProviderFromModel(downgraded, selectedProvider);
  };

  if (agentUtilization >= AGENT_DEGRADE_THRESHOLD) {
    maybeDowngrade(`Agent spend at ${(agentUtilization * 100).toFixed(1)}% of cap`);
  }

  if (globalUtilization >= GLOBAL_DEGRADE_THRESHOLD) {
    maybeDowngrade(`Global spend at ${(globalUtilization * 100).toFixed(1)}% of cap`);
  }

  // 3. TOKEN LIMITING WITH MESSAGE CLASS DISCIPLINE
  const promptTokens = estimateTokens(prompt);
  
  // Determine output token limit
  let outputTokenLimit: number;
  if (messageClass) {
    outputTokenLimit = getOutputTokenLimit(messageClass);
  } else {
    outputTokenLimit = OUTPUT_TOKEN_BUFFER;
  }
  
  // Total tokens for rate limiter includes prompt + bounded output
  const limiterTokens = promptTokens + outputTokenLimit;
  const promptHash = fingerprints?.finalHash ?? hashNormalized(normalizeBlock(prompt));
  const contextHash = fingerprints?.systemHash;
  let duplicateStatus: DuplicateStatus = 'fresh';

  console.log(
    `[LLM Exec] Scheduling ${selectedModel} via ${selectedProvider} for Agent ${agent_id} (est ${limiterTokens} tokens, class: ${messageClass ?? 'none'})`
  );

  // 4. EXECUTE WITH RATE LIMITING + DUPLICATE SUPPRESSION
  const dedupeKey = {
    agentId: agent_id,
    taskId: task_id,
    model: selectedModel,
    messageClass,
    promptHash,
    contextHash,
    toolStateHash,
  };

  const runResult = await promptCache.run(
    dedupeKey,
    () =>
      globalRateLimiter.schedule(
        selectedProvider,
        limiterTokens,
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 800));
          const inputTokens = Math.max(1, Math.floor(promptTokens));
          
          const maxOutput = messageClass ? outputTokenLimit : Math.floor(Math.random() * 500) + 100;
          const outputTokens = Math.min(maxOutput, messageClass ? outputTokenLimit : maxOutput);
          
          let responseText = 'Simulated response from ' + selectedModel;
          
          if (messageClass) {
            const guard = guardInternalContent(responseText, messageClass);
            if (!guard.safe) {
              console.warn('[MessagePolicy] Guard triggered:', guard.violations);
            }
            responseText = guard.sanitized;
          }
          
          return { inputTokens, outputTokens, responseText };
        },
        { agentId: agent_id, model: selectedModel }
      ),
    { allowReplay: allowCachedResponse, estTokens: limiterTokens }
  );
  duplicateStatus = runResult.status;

  const { inputTokens, outputTokens, responseText } = runResult.value;

  // 5. LOGGING & COST CALCULATION
  const totalTokens = inputTokens + outputTokens;
  const cost = calculateCost(selectedModel, inputTokens, outputTokens);

  await prisma.spendLog.create({
    data: {
      agent_id,
      model: selectedModel,
      provider: selectedProvider,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      tokens_total: totalTokens,
      cost,
      task_id: task_id || null,
      project_id: project_id || null,
    },
  });

  return {
    text: responseText,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
    },
    meta: {
      model: selectedModel,
      provider: selectedProvider,
      runtimeNotices,
      limiterTokens,
      messageClass,
      outputTokenLimit,
      duplicateStatus,
      promptHash,
    },
  };
}

// Export the disciplined call as the primary interface
export { callModelWithDiscipline as callModel };
