/**
 * Patch Integration Layer
 * Wraps OpenClaw calls with Phase 1 emergency patches
 * 
 * Tasks 1-2: Tool Output Summarization + Conversation Pruning
 */

import { PrismaClient } from '@prisma/client';
import { 
  checkBudget, 
    enforceBudget, 
  estimateTokens,
  MODEL_BUDGETS,
  BudgetStatus 
} from '@/lib/context/budgetEnforcer';
import { 
  pruneConversationHistory,
    getConversationStats 
} from '@/lib/context/conversationPruner';
import { 
  summarizeToolOutput,
    SummarizedOutput 
} from '@/lib/tools/outputSummarizer';
import { 
  quickRoute,
  ModelRoute,
  estimateModelCost,
  getProviderForModel,
} from '@/lib/models/quickRouter';
import { runRoutingGate, type RoutingGateResult, type GateDecision } from '@/lib/models/routingGate';
import { contextAssemblyService, type ContextAssemblyRequest, type ContextAssemblyResult } from '@/lib/services/contextAssemblyService';
import { executeWithModelFallback } from '@/lib/ai/modelRouter';
import { promptCache, type DuplicateStatus } from '@/lib/llm/promptCache';
import { hashNormalized } from '@/lib/context/promptFingerprint';
import { render } from '@/lib/messaging/templates';
import { recordRoutingEvent, recordRateLimiterEvent, recordAvoidableSpendEvent } from '@/lib/services/telemetry-service';
import { globalRateLimiter } from '@/lib/llm/rateLimiter';
import type { Provider } from '@/lib/llm/types';
import type { PriorityLevel } from '@/lib/llm/providerLimits';
import type { OpenRouterClientType } from '@/lib/openclaw/client';
import { Agent, Task } from '@contracts';

const prisma = new PrismaClient();
const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_DEFAULT_MODEL || 'openrouter/auto';
const MIN_COMPLETION_TOKENS = Number(process.env.OPENROUTER_MIN_COMPLETION_TOKENS ?? 1500);
const MAX_COMPLETION_TOKENS = Number(process.env.OPENROUTER_MAX_COMPLETION_TOKENS ?? 3000);
const DEFAULT_TEMPERATURE = Number(process.env.OPENROUTER_TEMPERATURE ?? 0.2);

interface AgentModelPreference {
  primary: string;
  fallback?: string;
  source: 'request' | 'agent-config' | 'default';
}
const CONTEXT_DEBUG_ENABLED = process.env.OPENROUTER_CONTEXT_DEBUG === '1';

type SimpleMessage = { role: string; content: string };

export interface CommandChannelInstrumentation {
  requestId: string;
  client?: {
    historyChars?: number;
    messageCount?: number;
    largestMessageChars?: number;
    payloadChars?: number;
  };
  metadata?: Record<string, unknown>;
  server?: {
    rawBodyChars: number;
    headerReportedChars?: number;
    rawMessageCount: number;
  };
  compaction?: {
    beforeCount: number;
    beforeChars: number;
    afterCount: number;
    afterChars: number;
    compacted: number;
    dropped: number;
    codeTaskMode: boolean;
  };
  finalPayload?: {
    systemChars: number;
    taskChars: number;
    memoryChars: number;
    conversationChars: number;
    otherContextChars: number;
    conversationMessageCount: number;
    finalMessageCount: number;
    finalCharCount: number;
    totalLayerChars: number;
    totalContextTokens: number;
  };
}

const CODE_TRIGGER_REGEX = /```|diff --git|@@|class\s|function\s|const\s|let\s|var\s|\/\//i;

interface HistoryStats {
  beforeCount: number;
  beforeChars: number;
  afterCount: number;
  afterChars: number;
  compacted: number;
  dropped: number;
  codeTaskMode: boolean;
}

function logContextSummary(params: {
  model: string;
  provider?: string;
  layers: { name: string; content: string; tokens: number }[];
  totalTokens: number;
  prunedMessages: Array<{ role: string; content: string }>;
  finalMessages: Array<{ role: string; content: string }>;
  limiterTokens: number;
  historyStats?: HistoryStats;
}) {
  if (!CONTEXT_DEBUG_ENABLED) return;
  const conversationChars = params.prunedMessages.reduce((sum, msg) => sum + msg.content.length, 0);
  const finalChars = params.finalMessages.reduce((sum, msg) => sum + msg.content.length, 0);
  console.log('[Context Debug] model=%s provider=%s totalTokens=%d limiterTokens=%d', params.model, params.provider || 'unknown', params.totalTokens, params.limiterTokens);
  for (const layer of params.layers) {
    const layerChars = layer.content.length;
    console.log(`  layer:${layer.name} tokens=${layer.tokens} chars=${layerChars}`);
  }
  console.log('  conversation messages=%d chars=%d', params.prunedMessages.length, conversationChars);
  console.log('  final payload messages=%d chars=%d', params.finalMessages.length, finalChars);
  if (params.historyStats) {
    const s = params.historyStats;
    console.log('  history stats: before=%d msgs/%d chars, after=%d msgs/%d chars, compacted=%d, dropped=%d, codeMode=%s', s.beforeCount, s.beforeChars, s.afterCount, s.afterChars, s.compacted, s.dropped, s.codeTaskMode ? 'yes' : 'no');
  }
}

function detectCodeTaskMode(messages: SimpleMessage[], model?: string): boolean {
  if (model && /codex|code|dev/i.test(model)) return true;
  return messages.some((msg) => msg.role === 'assistant' && (msg.content.length > 2500 || CODE_TRIGGER_REGEX.test(msg.content)));
}

function summarizeContentSnippet(content: string, limit: number = 160): string {
  const singleLine = content.replace(/\s+/g, ' ').trim();
  return singleLine.length <= limit ? singleLine : `${singleLine.slice(0, limit).trim()}…`;
}

function buildStub(role: string, content: string, reason: string): string {
  const snippet = summarizeContentSnippet(content, 140);
  return role === 'assistant'
    ? `[Previous assistant response condensed: ${reason}. ${snippet}]`
    : `[Earlier user instructions condensed: ${snippet}]`;
}

function applySizeAwareHistory(messages: SimpleMessage[], options: { codeTaskMode: boolean }): { messages: SimpleMessage[]; stats: HistoryStats } {
  const limits = options.codeTaskMode
    ? { maxChars: 8000, assistantCap: 1800, userCap: 2000, minMessages: 4 }
    : { maxChars: 20000, assistantCap: 5000, userCap: 3500, minMessages: 6 };

  const beforeChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  const reversed = [...messages].reverse();
  const kept: SimpleMessage[] = [];
  let runningChars = 0;
  let compacted = 0;
  let dropped = 0;
  let newestUserKept = false;

  for (const message of reversed) {
    const isUser = message.role === 'user';
    let content = message.content;
    let wasCompacted = false;

    if (isUser && !newestUserKept) {
      newestUserKept = true;
    } else {
      const threshold = message.role === 'assistant' ? limits.assistantCap : limits.userCap;
      if (message.content.length > threshold || (message.role === 'assistant' && CODE_TRIGGER_REGEX.test(message.content))) {
        content = buildStub(message.role, message.content, options.codeTaskMode ? 'code-task mode' : 'large response');
        wasCompacted = true;
      }
    }

    const addition = content.length;
    const overBudget = runningChars + addition > limits.maxChars;
    if (!newestUserKept && overBudget && kept.length >= limits.minMessages) {
      dropped++;
      continue;
    }

    if (wasCompacted) {
      compacted++;
    }

    kept.push({ ...message, content });
    runningChars += addition;
  }

  kept.reverse();
  const afterChars = kept.reduce((sum, msg) => sum + msg.content.length, 0);
  const stats: HistoryStats = {
    beforeCount: messages.length,
    beforeChars,
    afterCount: kept.length,
    afterChars,
    compacted,
    dropped,
    codeTaskMode: options.codeTaskMode,
  };

  return { messages: kept, stats };
}


function getBudgetForModel(model: string): number {
  if (MODEL_BUDGETS[model as keyof typeof MODEL_BUDGETS]) {
    return MODEL_BUDGETS[model as keyof typeof MODEL_BUDGETS].totalBudget;
  }
  if (model.startsWith('openrouter/')) {
    return MODEL_BUDGETS['openrouter/auto']?.totalBudget ?? 120000;
  }
  if (model.startsWith('google/')) {
    return MODEL_BUDGETS['gemini-1.5-pro']?.totalBudget ?? 100000;
  }
  if (model.startsWith('openai/')) {
    return MODEL_BUDGETS['claude-3.7-sonnet']?.totalBudget ?? 100000;
  }
  return MODEL_BUDGETS['kimi-k2.5']?.totalBudget ?? 100000;
}

function uniqueModels(models: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const name of models) {
    if (!name) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    ordered.push(name);
  }
  return ordered;
}

async function resolveAgentModelPreference(agentId: string, requested?: string): Promise<AgentModelPreference> {
  if (requested?.trim()) {
    return { primary: requested.trim(), source: 'request' };
  }

  try {
    const config = await prisma.agent_model_config.findUnique({
      where: { agent_id: agentId },
      include: {
        primary_model: true,
        fallback_model: true,
      },
    });

    if (config?.primary_model?.name) {
      return {
        primary: config.primary_model.name,
        fallback: config.fallback_model?.name || undefined,
        source: 'agent-config',
      };
    }
  } catch (error) {
    console.warn('[ModelPrefs] Failed to load agent model config', error);
  }

  return { primary: DEFAULT_OPENROUTER_MODEL, source: 'default' };
}

function computeAdaptiveMaxTokens(metadata: ContextAssemblyResult['metadata']): number {
  const budgetTokens = metadata?.budgetTokens ?? 200000;
  const used = metadata?.totalTokens ?? 0;
  const remaining = Math.max(0, budgetTokens - used);
  const adaptive = remaining > 0 ? Math.floor(remaining * 0.25) : MIN_COMPLETION_TOKENS;
  const clamped = Math.max(MIN_COMPLETION_TOKENS, Math.min(MAX_COMPLETION_TOKENS, adaptive));
  return clamped || MIN_COMPLETION_TOKENS;
}

export interface OpenClawRequestConfig {
  agentId: string;
  taskId?: string;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  tools?: unknown[];
  workspaceId?: string;
  instrumentation?: CommandChannelInstrumentation;
}

export interface PatchedOpenClawResponse {
  content: string;
  toolCalls?: unknown[];
  modelUsed: string;
  wasRouted: boolean;
  routingReason: string;
  budgetStatus: BudgetStatus;
  contextLayers: string[];
  excludedLayers: string[];
  wasTruncated: boolean;
  originalModel: string;
  duplicateStatus?: DuplicateStatus;
  promptHash?: string;
  fingerprints?: ContextAssemblyResult['metadata']['fingerprints'];
  reusedLayers?: string[];
  gateDecision: GateDecision;
  gateRationale: string;
  gateComplexity: number;
  gateConfidence: number;
  estimatedSavingsUsd?: number;
  canonicalMemoryUsed: boolean;
  canonicalMemoryMatches: number;
  canonicalMemoryFiles: string[];
}

/**
 * Task 1: Wrap Tool Execution with Output Summarization
 * 
 * Applies 500-token limit to all tool outputs before they reach context
 */
export function wrapToolExecution(
  originalExecute: (call: Record<string, unknown>, agent: Agent) => Promise<string>
): (call: Record<string, unknown>, agent: Agent) => Promise<string> {
  return async (call: Record<string, unknown>, agent: Agent): Promise<string> => {
    const toolName = call.function?.name || 'unknown';
    
    // Execute original tool
    const rawOutput = await originalExecute(call, agent);
    
    // Apply summarization
    const summary = summarizeToolOutput(toolName, rawOutput, {
      maxTokens: 500,
      preserveErrors: true,
      preserveFirstN: 100,
      preserveLastN: 100
    });
    
    // Log telemetry about summarization
    console.log(`[Tool Summarizer] ${toolName}: ${summary.originalTokens} → ${summary.summaryTokens} tokens (${summary.compressionRatio.toFixed(1)}x compression)`);
    
    return summary.summary;
  };
}

/**
 * Task 2: Wrap Conversation Building with Pruning
 * 
 * Keeps only last 10 messages + summary of older messages
 */
export function pruneMessages(
  messages: Array<{ role: string; content: string }>,
  options?: { maxMessages?: number; targetTokens?: number }
): { messages: Array<{ role: string; content: string }>; wasPruned: boolean; summary?: string } {
  const result = pruneConversationHistory(messages, {
    maxMessages: options?.maxMessages || 10,
    targetTokens: options?.targetTokens
  });
  
  return {
    messages: result.messages,
    wasPruned: result.wasPruned,
    summary: result.summary
  };
}

/**
 * Enhanced Request Handler with All Patches Applied
 * 
 * This is the main integration point - call this instead of raw openclaw.chat.completions.create
 */
export async function executePatchedOpenClawRequest(
  config: OpenClawRequestConfig,
  openclawClient: OpenRouterClientType
): Promise<PatchedOpenClawResponse> {
  const startTime = Date.now();
  const instrumentation = config.instrumentation || null;
  
  const estimatedTokens = estimateTokensFromMessages(config.messages);
  const pruneResult = pruneMessages(
    config.messages,
    { maxMessages: 10 }
  );
  const codeTaskMode = detectCodeTaskMode(pruneResult.messages, config.model);
  const sizeAwareHistory = applySizeAwareHistory(pruneResult.messages, { codeTaskMode });
  const prunedMessages = sizeAwareHistory.messages;

  if (instrumentation) {
    instrumentation.compaction = {
      beforeCount: sizeAwareHistory.stats.beforeCount,
      beforeChars: sizeAwareHistory.stats.beforeChars,
      afterCount: sizeAwareHistory.stats.afterCount,
      afterChars: sizeAwareHistory.stats.afterChars,
      compacted: sizeAwareHistory.stats.compacted,
      dropped: sizeAwareHistory.stats.dropped,
      codeTaskMode,
    };
  }

  if (pruneResult.wasPruned || sizeAwareHistory.stats.compacted > 0 || sizeAwareHistory.stats.dropped > 0) {
    const summaryPreview = pruneResult.summary?.substring(0, 50) || 'n/a';
    console.log(`[Conversation Pruner] Reduced to ${prunedMessages.length} messages (summary: ${summaryPreview}..., compacted=${sizeAwareHistory.stats.compacted}, dropped=${sizeAwareHistory.stats.dropped}, codeMode=${codeTaskMode})`);
  }

  const userMessage = getLastUserMessage(prunedMessages);
  const taskType = inferTaskType(config.tools);
  const toolNames = (config.tools || []).map((tool) => tool.function?.name || '');

  let gateResult: RoutingGateResult;
  try {
    gateResult = runRoutingGate({
      userMessage,
      taskType,
      toolNames,
      estimatedTokens,
      forcePremium: Boolean(config.model && config.model.includes('opus')),
    });
  } catch (error) {
    console.error('[Routing Gate] Failed, defaulting to premium path', error);
    gateResult = {
      decision: 'premium',
      requiresModel: true,
      requiresPremium: true,
      recommendedTier: 'premium',
      complexityScore: 0.6,
      confidenceScore: 0.3,
      indicators: ['gate-error'],
      rationale: 'Gate failure',
      escalateReasons: ['gate-error'],
      estimatedTokens,
    };
  }

  const premiumRoute = quickRoute({
    estimatedTokens,
    taskType,
    preferredModel: config.model,
  });

  const CHEAP_MODEL = DEFAULT_OPENROUTER_MODEL;
  const cheapRoute: ModelRoute = {
    model: CHEAP_MODEL,
    provider: getProviderForModel(CHEAP_MODEL),
    reason: 'cheap_gate',
    estimatedCost: estimateModelCost(CHEAP_MODEL, gateResult.estimatedTokens),
    fallbackChain: [],
    warnings: [],
  };

  let selectedRoute: ModelRoute = premiumRoute;
  if (gateResult.decision === 'cheap' && !gateResult.requiresPremium) {
    selectedRoute = cheapRoute;
  }

  console.log(
    `[Routing Gate] decision=${gateResult.decision} tier=${selectedRoute.model} complexity=${gateResult.complexityScore.toFixed(2)} confidence=${gateResult.confidenceScore.toFixed(2)}`
  );

  if (gateResult.decision === 'no_model') {
    const estimatedSavings = premiumRoute.estimatedCost;
    await recordRoutingEvent({
      workspaceId: config.workspaceId || 'business',
      agentId: config.agentId,
      decision: gateResult.decision,
      tier: 'none',
      estimatedSavingsUsd: estimatedSavings,
      rationale: gateResult.rationale,
      escalateReasons: gateResult.escalateReasons,
      complexity: gateResult.complexityScore,
      confidence: gateResult.confidenceScore,
    });
    return buildNoModelResponse({
      gate: gateResult,
      config,
      estimatedSavings,
    });
  }

  const requestedModel = config.model?.trim();
  const modelPreference = await resolveAgentModelPreference(config.agentId, requestedModel);
  const preferredModel = modelPreference.primary || selectedRoute.model || DEFAULT_OPENROUTER_MODEL;
  const fallbackChain = uniqueModels([
    modelPreference.fallback,
    ...selectedRoute.fallbackChain,
    DEFAULT_OPENROUTER_MODEL,
  ]).filter((model) => model && model !== preferredModel);

  const wasRouted = requestedModel ? preferredModel !== requestedModel : selectedRoute.model !== preferredModel;

  const estimatedSavings = Math.max(0, premiumRoute.estimatedCost - selectedRoute.estimatedCost);
  await recordRoutingEvent({
    workspaceId: config.workspaceId || 'business',
    agentId: config.agentId,
    decision: gateResult.decision,
    tier: gateResult.decision === 'premium' ? 'premium' : 'cheap',
    estimatedSavingsUsd: estimatedSavings,
    rationale: gateResult.rationale,
    escalateReasons: gateResult.escalateReasons,
    complexity: gateResult.complexityScore,
    confidence: gateResult.confidenceScore,
  });

  console.log(
    `[Model Router] ${requestedModel || 'auto'} → ${preferredModel} (${selectedRoute.reason}, source=${modelPreference.source})`
  );
  
  // Step 3: Assemble context with budget enforcement
  const assemblyResult = await contextAssemblyService.assemble({
    agentId: config.agentId,
    taskId: config.taskId,
    userMessage,
    conversationHistory: prunedMessages,
    model: preferredModel,
    workspaceId: config.workspaceId || 'business'
  });

  if (assemblyResult.metadata.wasTruncated) {
    recordAvoidableSpendEvent({
      workspaceId: config.workspaceId || 'business',
      agentId: config.agentId,
      taskId: config.taskId,
      reason: 'truncation',
      truncatedTokens: 0,
      messageClass: 'context',
      model: preferredModel,
      provider: selectedRoute.provider,
    }).catch((error) => console.warn('[Telemetry] avoidable spend truncation failed', error));
  }

  const adaptiveMaxTokens = computeAdaptiveMaxTokens(assemblyResult.metadata);
  const finalMessages = [
    { role: 'system', content: assemblyResult.layers[0]?.content || '' },
    ...convertToOpenAIFormat(prunedMessages)
  ];

  if (instrumentation) {
    const systemLayer = assemblyResult.layers.find((layer) => layer.name === 'system');
    const taskLayer = assemblyResult.layers.find((layer) => layer.name === 'task');
    const memoryLayer = assemblyResult.layers.find((layer) => layer.name === 'memory');
    const layerChars = (layer?: { content: string }) => (layer ? layer.content.length : 0);
    const conversationChars = prunedMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    const finalCharCount = finalMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    const otherContextChars = assemblyResult.layers
      .filter((layer) => !['system', 'task', 'memory', 'conversation'].includes(layer.name))
      .reduce((sum, layer) => sum + (layer.content.length), 0);
    const totalLayerChars = assemblyResult.layers.reduce((sum, layer) => sum + (layer.content.length), 0);

    instrumentation.finalPayload = {
      systemChars: layerChars(systemLayer),
      taskChars: layerChars(taskLayer),
      memoryChars: layerChars(memoryLayer),
      conversationChars,
      otherContextChars,
      conversationMessageCount: prunedMessages.length,
      finalMessageCount: finalMessages.length,
      finalCharCount,
      totalLayerChars,
      totalContextTokens: assemblyResult.metadata.totalTokens,
    };
  }

  logContextSummary({
    model: preferredModel,
    provider: selectedRoute.provider,
    layers: assemblyResult.layers.map((layer) => ({ name: layer.name, content: layer.content, tokens: layer.tokens })),
    totalTokens: assemblyResult.metadata.totalTokens,
    prunedMessages,
    finalMessages,
    limiterTokens: Math.max(1, Math.ceil((assemblyResult.metadata.totalTokens || estimatedTokens) * 1.1)),
    historyStats: sizeAwareHistory.stats,
  });
  
  const assembledTokens = assemblyResult.metadata.totalTokens || estimatedTokens;
  const limiterTokens = Math.max(1, Math.ceil(assembledTokens * 1.1));
  const rateLimiterPriority = priorityFromGateDecision(gateResult);
  const limiterStart = Date.now();
  let limiterLatency = 0;
  
  // Step 4: Final budget check before API call
  const budgetStatus = checkBudget(assemblyResult.assembledPrompt, preferredModel);
  
  if (budgetStatus.pressureLevel === 'critical') {
    console.warn(`[Budget Enforcer] CRITICAL: ${budgetStatus.percentUsed.toFixed(0)}% budget used. Consider breaking task.`);
  } else if (budgetStatus.pressureLevel === 'high') {
    console.warn(`[Budget Enforcer] HIGH: ${budgetStatus.percentUsed.toFixed(0)}% budget used.`);
  }
  
  // Step 5: Make the API call with deterministic fallback + duplicate suppression
  let modelUsed = preferredModel;
  let response;
  let fallbackAttempts;
  let duplicateStatus: DuplicateStatus = 'fresh';
  const toolStateHash = config.tools?.length ? hashNormalized(JSON.stringify(config.tools)) : undefined;
  const allowReplay = !config.tools || config.tools.length === 0;
  const dedupeKey = {
    agentId: config.agentId,
    taskId: config.taskId,
    model: preferredModel,
    promptHash: assemblyResult.metadata.fingerprints.finalHash,
    contextHash: assemblyResult.metadata.fingerprints.systemHash,
    toolStateHash,
  };
  try {
    const runResult = await promptCache.run(
      dedupeKey,
      () =>
        executeWithModelFallback(
          preferredModel,
          async (model) => {
            const provider = (selectedRoute?.provider ?? getProviderForModel(model)) as Provider;
            return globalRateLimiter.schedule(
              provider,
              limiterTokens,
              async () => {
                try {
                  const call = await openclawClient.chat.completions.create({
                    model,
                    temperature: DEFAULT_TEMPERATURE,
                    max_tokens: adaptiveMaxTokens,
                    messages: [
                      { role: 'system', content: assemblyResult.layers[0]?.content || '' },
                      ...convertToOpenAIFormat(prunedMessages)
                    ],
                    tools: config.tools,
                  });
                  return call;
                } catch (error: unknown) {
                  if (error?.message?.includes('token') || error?.code === 'context_length_exceeded') {
                    console.error(`[Budget Enforcer] Token limit exceeded. Original request: ${estimatedTokens} tokens`);
                    throw new Error(`Context budget exceeded. Request was ${estimatedTokens} tokens, max is ${getBudgetForModel(model)}.`);
                  }
                  throw error;
                }
              },
              { agentId: config.agentId, model },
              { priority: rateLimiterPriority, burstSensitive: rateLimiterPriority !== 'P0' }
            );
          },
          { fallbackChain }
        ),
      {
        allowReplay,
        estTokens: limiterTokens,
        coalesceInFlight: allowReplay && (rateLimiterPriority === 'P2' || rateLimiterPriority === 'P3'),
      }
    );

    limiterLatency = Date.now() - limiterStart;
    duplicateStatus = runResult.status;
    const result = runResult.value;
    response = result.result;
    modelUsed = result.modelUsed;
    fallbackAttempts = result.attempts;
  } catch (error) {
    throw error;
  }
  
  const message = response.choices?.[0]?.message || { content: '' };
  const usageStats = response.usage || {};
  const headerMeta = response.metadata as { cost?: number; tokensInput?: number; tokensOutput?: number; tokensTotal?: number } | undefined;
  const inputTokens = usageStats.prompt_tokens ?? Math.max(1, Math.floor(estimatedTokens));
  const outputTokens = usageStats.completion_tokens ?? Math.max(0, (usageStats.total_tokens ?? inputTokens) - inputTokens);
  const totalTokens = usageStats.total_tokens ?? inputTokens + outputTokens;
  const openRouterCost = typeof headerMeta?.cost === 'number' ? headerMeta.cost : undefined;
  
  // Step 6: Log telemetry
  const duration = Date.now() - startTime;
  const renderedCost = openRouterCost !== undefined ? `$${openRouterCost.toFixed(6)}` : 'n/a';
  console.log(
    `[OpenRouter] Request completed in ${duration}ms using ${modelUsed} (${duplicateStatus}) input=${inputTokens} output=${outputTokens} cost=${renderedCost}`
  );
  if (fallbackAttempts?.length) {
    console.log(`[OpenRouter] Fallback attempts: ${fallbackAttempts.map(a => `${a.model}:${a.success ? 'ok' : 'fail'}`).join(', ')}`);
  }

  const providerUsed = getProviderForModel(modelUsed) as Provider;
  const pressureSnapshot = globalRateLimiter.getPressure(providerUsed);
  const limiterMetrics = globalRateLimiter.getMetrics(providerUsed);
  if (
    pressureSnapshot.mode !== 'normal' ||
    limiterMetrics.nearMisses > 0 ||
    limiterLatency > 250
  ) {
    recordRateLimiterEvent({
      workspaceId: config.workspaceId || 'business',
      agentId: config.agentId,
      taskId: config.taskId,
      provider: providerUsed,
      model: modelUsed,
      priority: rateLimiterPriority,
      pressure: pressureSnapshot,
      metrics: limiterMetrics,
      latencyMs: limiterLatency,
    }).catch((error) => console.warn('[Telemetry] rate limiter event failed', error));
  }
  
  if (instrumentation) {
    console.log('[CommandChannel][Instrumentation][Summary]', JSON.stringify(instrumentation));
  }
  
  return {
    content: message.content || '',
    toolCalls: message.tool_calls,
    modelUsed,
    wasRouted,
    routingReason: selectedRoute.reason,
    budgetStatus,
    contextLayers: assemblyResult.layers.map(l => l.name),
    excludedLayers: assemblyResult.metadata.excludedLayers,
    wasTruncated: assemblyResult.metadata.wasTruncated,
    originalModel: config.model || 'auto',
    duplicateStatus,
    promptHash: assemblyResult.metadata.fingerprints.finalHash,
    fingerprints: assemblyResult.metadata.fingerprints,
    reusedLayers: assemblyResult.metadata.reusedLayers,
    gateDecision: gateResult.decision,
    gateRationale: gateResult.rationale,
    gateComplexity: gateResult.complexityScore,
    gateConfidence: gateResult.confidenceScore,
    estimatedSavingsUsd: estimatedSavings,
    canonicalMemoryUsed: Boolean(assemblyResult.metadata.canonicalMemoryUsed),
    canonicalMemoryMatches: assemblyResult.metadata.canonicalMemoryMatches,
    canonicalMemoryFiles: assemblyResult.metadata.canonicalMemoryFiles,
  };
}

/**
 * Helper: Map gate decisions to priority lanes
 */
function priorityFromGateDecision(gate: RoutingGateResult): PriorityLevel {
  if (gate.escalateReasons?.some((reason) => ['critical', 'compliance', 'blocking-tool'].includes(reason))) {
    return 'P0';
  }
  switch (gate.decision) {
    case 'premium':
      return gate.requiresPremium ? 'P0' : 'P1';
    case 'cheap':
      return 'P2';
    default:
      return 'P3';
  }
}

/**
 * Helper: Estimate tokens from message array
 */
function estimateTokensFromMessages(
  messages: Array<{ role: string; content: string }>
): number {
  const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  return estimateTokens(text);
}

/**
 * Helper: Infer task type from tools
 */
function inferTaskType(tools?: unknown[]): 'coding' | 'analysis' | 'conversation' {
  if (!tools || tools.length === 0) return 'conversation';
  
  const toolNames = tools.map(t => t.function?.name || '').join(' ');
  if (toolNames.includes('write_file') || toolNames.includes('read_file') || toolNames.includes('run_command')) {
    return 'coding';
  }
  if (toolNames.includes('search') || toolNames.includes('analyze')) {
    return 'analysis';
  }
  return 'conversation';
}

/**
 * Helper: Get last user message
 */
function getLastUserMessage(
  messages: Array<{ role: string; content: string }>
): string {
  const userMessages = messages.filter(m => m.role === 'user');
  return userMessages[userMessages.length - 1]?.content || '';
}

/**
 * Helper: Convert to OpenAI format
 */
function convertToOpenAIFormat(
  messages: Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  return messages.filter(m => m.role !== 'system');
}

/**
 * Integration: Wrap existing executeToolCall
 * 
 * Usage in runAgent.ts:
 *   import { wrapToolExecution } from '@/lib/patches/integration';
 *   import { executeToolCall as originalExecute } from '@/lib/tools/executeTool';
 *   const executeToolCall = wrapToolExecution(originalExecute);
 */
function buildNoModelResponse(params: {
  gate: RoutingGateResult;
  config: OpenClawRequestConfig;
  estimatedSavings: number;
}): PatchedOpenClawResponse {
  const ack = render.ack({});
  const stubBudget: BudgetStatus = {
    withinBudget: true,
    currentTokens: 0,
    budgetTokens: 0,
    percentUsed: 0,
    pressureLevel: 'low',
  };

  return {
    content: ack.content,
    toolCalls: [],
    modelUsed: 'no-model',
    wasRouted: false,
    routingReason: 'no-model',
    budgetStatus: stubBudget,
    contextLayers: [],
    excludedLayers: [],
    wasTruncated: false,
    originalModel: params.config.model || 'auto',
    duplicateStatus: 'fresh',
    promptHash: undefined,
    fingerprints: undefined,
    reusedLayers: [],
    gateDecision: params.gate.decision,
    gateRationale: params.gate.rationale,
    gateComplexity: params.gate.complexityScore,
    gateConfidence: params.gate.confidenceScore,
    estimatedSavingsUsd: params.estimatedSavings,
  };
}
