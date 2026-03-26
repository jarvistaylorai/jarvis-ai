import { PrismaClient } from '@prisma/client';
import { calculateCost } from '@/lib/costs/modelPricing';
import { estimateTokens } from '@/lib/context/budgetEnforcer';
import { globalRateLimiter } from '@/lib/llm/rateLimiter';
import type { PriorityLevel } from '@/lib/llm/providerLimits';
import { render as renderPresets, renderTemplate as renderTemplateById, type TemplateId } from '@/lib/messaging/templates';
import { recordRateLimiterEvent, recordAvoidableSpendEvent, recordVerbositySample } from '@/lib/services/telemetry-service';
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
  priority?: PriorityLevel;
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
  priority = 'P1',
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
  const workspaceId = project_id || 'business';

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
  const requestedModel = model;
  const requestedProvider: Provider = provider;
  let selectedModel = model;
  let selectedProvider: Provider = provider;
  let downgradedFrom: string | undefined;
  let templateApplied = false;

  const agentUtilization = agentSpendToday / agentLimit;
  const globalUtilization =
    GLOBAL_DAILY_CAP === Infinity ? 0 : globalSpendToday / GLOBAL_DAILY_CAP;

  const maybeDowngrade = (reason: string) => {
    const downgraded = MODEL_DOWNGRADE_MAP[selectedModel];
    if (!downgraded || downgraded === selectedModel) return;
    
    // Use template for downgrade notification if available
    const notice = operationTemplate && templateValues
      ? renderPresets.downgradedModel({
          ...templateValues,
          fromModel: selectedModel,
          toModel: downgraded,
        }).content
      : `↓ Budget cap: ${selectedModel} → ${downgraded}`;
    
    runtimeNotices.push(notice);
    downgradedFrom = downgradedFrom ?? selectedModel;
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
  const providerPressure = globalRateLimiter.getPressure(selectedProvider);

  if (providerPressure.mode === 'protection' && priority === 'P3') {
    maybeDowngrade('Runtime protection mode downgrade');
  } else if (providerPressure.mode === 'emergency' && priority !== 'P0') {
    maybeDowngrade('Runtime emergency mode downgrade');
  }
  
  // Determine output token limit
  let outputTokenLimit: number;
  if (messageClass) {
    outputTokenLimit = getOutputTokenLimit(messageClass);
  } else {
    outputTokenLimit = OUTPUT_TOKEN_BUFFER;
  }

  if (providerPressure.mode === 'economy' && priority !== 'P0') {
    outputTokenLimit = Math.floor(outputTokenLimit * 0.9);
    runtimeNotices.push(`Economy mode: reduced output tokens (${outputTokenLimit}).`);
  } else if (providerPressure.mode === 'protection' && priority === 'P3') {
    outputTokenLimit = Math.floor(outputTokenLimit * 0.7);
    runtimeNotices.push('Protection mode: aggressive cap on low-priority output.');
  } else if (providerPressure.mode === 'emergency' && priority !== 'P0') {
    outputTokenLimit = Math.floor(outputTokenLimit * 0.6);
    runtimeNotices.push('Emergency mode: severe output cap applied.');
  }

  const templateEligible =
    preferTemplate &&
    !!messageClass &&
    !!operationTemplate &&
    !!templateValues &&
    shouldUseTemplate(messageClass);

  if (templateEligible) {
    try {
      const rendered = renderTemplateById(operationTemplate as TemplateId, templateValues ?? {});
      const avoidedTokens = promptTokens + outputTokenLimit;
      const avoidedUsdTemplate = calculateCost(selectedModel, promptTokens, outputTokenLimit);
      templateApplied = true;

      await prisma.spendLog.create({
        data: {
          agent_id,
          model: selectedModel,
          provider: selectedProvider,
          tokens_input: 0,
          tokens_output: rendered.tokenEstimate,
          tokens_total: rendered.tokenEstimate,
          cost: 0,
          task_id: task_id || null,
          project_id: project_id || null,
          message_class: messageClass,
          priority,
          duplicate_status: 'fresh',
          downgraded_from: null,
          avoided_tokens: avoidedTokens,
          avoided_usd: avoidedUsdTemplate,
          avoided_reason: 'template',
          tokens_reused: 0,
          tokens_truncated: 0,
          verbosity_flag: false,
          pressure_mode: providerPressure.mode,
          workspace: workspaceId,
        },
      });

      recordAvoidableSpendEvent({
        workspaceId,
        agentId: agent_id,
        taskId: task_id,
        projectId: project_id,
        reason: 'template',
        tokensAvoided: avoidedTokens,
        usdAvoided: avoidedUsdTemplate,
        messageClass,
        model: selectedModel,
        provider: selectedProvider,
      }).catch((error) => console.warn('[Telemetry] template savings event failed', error));

      await recordVerbositySample({
        workspaceId,
        messageClass,
        tokens: rendered.tokenEstimate,
        outputLimit: outputTokenLimit,
        agentId: agent_id,
        taskId: task_id,
      });

      return {
        text: rendered.content,
        usage: {
          inputTokens: 0,
          outputTokens: rendered.tokenEstimate,
          totalTokens: rendered.tokenEstimate,
          cost: 0,
        },
        meta: {
          model: selectedModel,
          provider: selectedProvider,
          runtimeNotices,
          limiterTokens: avoidedTokens,
          messageClass,
          outputTokenLimit,
          duplicateStatus: 'fresh' as DuplicateStatus,
          promptHash,
          templateUsed: true,
        },
      };
    } catch (error) {
      console.warn('[Templates] Failed to render operation template', error);
    }
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

  const limiterStart = Date.now();
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
        { agentId: agent_id, model: selectedModel },
        { priority, burstSensitive: priority !== 'P0' }
      ),
    {
      allowReplay: allowCachedResponse,
      estTokens: limiterTokens,
      coalesceInFlight: allowCachedResponse && (priority === 'P2' || priority === 'P3'),
    }
  );
  const limiterLatency = Date.now() - limiterStart;
  duplicateStatus = runResult.status;

  const { inputTokens, outputTokens, responseText } = runResult.value;

  // 5. LOGGING & COST CALCULATION
  const totalTokens = inputTokens + outputTokens;
  const executedCost = calculateCost(selectedModel, inputTokens, outputTokens);
  const requestedCost = calculateCost(requestedModel, inputTokens, outputTokens);
  const isFresh = duplicateStatus === 'fresh';
  const loggedInputTokens = isFresh ? inputTokens : 0;
  const loggedOutputTokens = isFresh ? outputTokens : 0;
  const loggedTotalTokens = isFresh ? totalTokens : 0;
  const loggedCost = isFresh ? executedCost : 0;
  const tokensReused = isFresh ? 0 : limiterTokens;
  const replayUsd = isFresh ? 0 : executedCost;
  const downgradeUsd = Math.max(0, requestedCost - executedCost);
  const avoidedUsd = replayUsd + downgradeUsd;
  const avoidedTokens = tokensReused;
  const avoidedReasons: string[] = [];
  if (tokensReused > 0) avoidedReasons.push('replay');
  if (downgradedFrom) avoidedReasons.push('downgrade');
  const avoidedReason = avoidedReasons.length ? avoidedReasons.join(',') : null;
  const verbosityLimit = messageClass ? getOutputTokenLimit(messageClass) : undefined;
  const verbosityFlag = verbosityLimit ? outputTokens > Math.floor(verbosityLimit * 0.9) : false;

  await prisma.spendLog.create({
    data: {
      agent_id,
      model: selectedModel,
      provider: selectedProvider,
      tokens_input: loggedInputTokens,
      tokens_output: loggedOutputTokens,
      tokens_total: loggedTotalTokens,
      cost: loggedCost,
      task_id: task_id || null,
      project_id: project_id || null,
      message_class: messageClass || null,
      priority,
      duplicate_status: duplicateStatus,
      downgraded_from: downgradedFrom || null,
      avoided_tokens: avoidedTokens,
      avoided_usd: avoidedUsd,
      avoided_reason: avoidedReason,
      tokens_reused: tokensReused,
      tokens_truncated: 0,
      verbosity_flag: verbosityFlag,
      pressure_mode: providerPressure.mode,
      workspace: workspaceId,
    },
  });

  const fingerprintDay = new Date();
  fingerprintDay.setUTCHours(0, 0, 0, 0);

  await prisma.promptFingerprint.upsert({
    where: {
      workspace_prompt_hash: {
        workspace: workspaceId,
        prompt_hash: promptHash,
      },
    },
    update: {
      context_hash: contextHash,
      message_class: messageClass || null,
      priority,
      model: selectedModel,
      agent_id,
      total_calls: { increment: 1 },
      duplicate_calls: duplicateStatus === 'fresh' ? undefined : { increment: 1 },
      last_seen: new Date(),
    },
    create: {
      workspace: workspaceId,
      prompt_hash: promptHash,
      context_hash: contextHash,
      message_class: messageClass || null,
      priority,
      model: selectedModel,
      agent_id,
      total_calls: 1,
      duplicate_calls: duplicateStatus === 'fresh' ? 0 : 1,
    },
  });

  await prisma.promptFingerprintDay.upsert({
    where: {
      workspace_prompt_hash_day: {
        workspace: workspaceId,
        prompt_hash: promptHash,
        day: fingerprintDay,
      },
    },
    update: {
      calls: { increment: 1 },
      duplicate_calls: duplicateStatus === 'fresh' ? undefined : { increment: 1 },
    },
    create: {
      workspace: workspaceId,
      prompt_hash: promptHash,
      day: fingerprintDay,
      calls: 1,
      duplicate_calls: duplicateStatus === 'fresh' ? 0 : 1,
    },
  });

  if (messageClass) {
    await recordVerbositySample({
      workspaceId,
      messageClass,
      tokens: outputTokens,
      outputLimit: outputTokenLimit,
      agentId: agent_id,
      taskId: task_id,
    });
  }

  const finalPressure = globalRateLimiter.getPressure(selectedProvider);
  const limiterMetrics = globalRateLimiter.getMetrics(selectedProvider);
  if (
    finalPressure.mode !== 'normal' ||
    limiterMetrics.nearMisses > 0 ||
    limiterLatency > 250
  ) {
    recordRateLimiterEvent({
      workspaceId,
      agentId: agent_id,
      taskId: task_id,
      provider: selectedProvider,
      model: selectedModel,
      priority,
      pressure: finalPressure,
      metrics: limiterMetrics,
      latencyMs: limiterLatency,
    }).catch((error) => console.warn('[Telemetry] rate limiter event failed', error));
  }

  if (tokensReused > 0) {
    recordAvoidableSpendEvent({
      workspaceId,
      agentId: agent_id,
      taskId: task_id,
      projectId: project_id,
      reason: 'replay',
      tokensAvoided: tokensReused,
      usdAvoided: replayUsd,
      promptHash,
      duplicateStatus,
      priority,
      messageClass,
      model: selectedModel,
      provider: selectedProvider,
    }).catch((error) => console.warn('[Telemetry] avoidable spend replay failed', error));
  }

  if (downgradedFrom) {
    recordAvoidableSpendEvent({
      workspaceId,
      agentId: agent_id,
      taskId: task_id,
      projectId: project_id,
      reason: 'downgrade',
      tokensAvoided: 0,
      usdAvoided: downgradeUsd,
      downgradedFrom,
      downgradedTo: selectedModel,
      priority,
      messageClass,
      model: selectedModel,
      provider: selectedProvider,
      pressureMode: providerPressure.mode,
    }).catch((error) => console.warn('[Telemetry] avoidable spend downgrade failed', error));
  }

  if (verbosityFlag && verbosityLimit) {
    recordAvoidableSpendEvent({
      workspaceId,
      agentId: agent_id,
      taskId: task_id,
      projectId: project_id,
      reason: 'verbosity',
      outputTokens,
      outputLimit: verbosityLimit,
      priority,
      messageClass,
      model: selectedModel,
      provider: selectedProvider,
    }).catch((error) => console.warn('[Telemetry] avoidable spend verbosity failed', error));
  }

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
      templateUsed: templateApplied,
    },
  };
}

// Export the disciplined call as the primary interface
export { callModelWithDiscipline as callModel };
