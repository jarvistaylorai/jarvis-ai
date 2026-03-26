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
import { Agent, Task } from '@contracts';

const prisma = new PrismaClient();

function getBudgetForModel(model: string): number {
  if (MODEL_BUDGETS[model as keyof typeof MODEL_BUDGETS]) {
    return MODEL_BUDGETS[model as keyof typeof MODEL_BUDGETS].totalBudget;
  }
  if (model.startsWith('google/gemini')) {
    return MODEL_BUDGETS['gemini-1.5-pro']?.totalBudget ?? 100000;
  }
  if (model.startsWith('openai/')) {
    return MODEL_BUDGETS['claude-3.7-sonnet']?.totalBudget ?? 100000;
  }
  return MODEL_BUDGETS['kimi-k2.5']?.totalBudget ?? 100000;
}

export interface OpenClawRequestConfig {
  agentId: string;
  taskId?: string;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  tools?: unknown[];
  workspaceId?: string;
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
  openclawClient: unknown
): Promise<PatchedOpenClawResponse> {
  const startTime = Date.now();
  
  const estimatedTokens = estimateTokensFromMessages(config.messages);
  const { messages: prunedMessages, wasPruned, summary } = pruneMessages(
    config.messages,
    { maxMessages: 10 }
  );
  
  if (wasPruned) {
    console.log(`[Conversation Pruner] Reduced to ${prunedMessages.length} messages, summary: ${summary?.substring(0, 50)}...`);
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

  const CHEAP_MODEL = 'kimi-k2.5';
  const cheapRoute: ModelRoute = {
    model: CHEAP_MODEL,
    provider: getProviderForModel(CHEAP_MODEL),
    reason: 'cheap_gate',
    estimatedCost: estimateModelCost(CHEAP_MODEL, gateResult.estimatedTokens),
    fallbackChain: ['claude-3.7-sonnet'],
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

  const wasRouted = config.model ? selectedRoute.model !== config.model : true;

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

  const preferredModel = selectedRoute.model;
  console.log(`[Model Router] ${config.model || 'auto'} → ${preferredModel} (${selectedRoute.reason})`);
  
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
  const assembledTokens = assemblyResult.metadata.totalTokens || estimatedTokens;
  const limiterTokens = Math.max(1, Math.ceil(assembledTokens * 1.1));
  const rateLimiterPriority = priorityFromGateDecision(gateResult);
  const limiterStart = Date.now();
  let limiterLatency = 0;

  try {
    const runResult = await promptCache.run(
      dedupeKey,
      () =>
        executeWithModelFallback(preferredModel, async (model) => {
          const provider = (selectedRoute?.provider ?? getProviderForModel(model)) as Provider;
          return globalRateLimiter.schedule(
            provider,
            limiterTokens,
            async () => {
              try {
                const call = await openclawClient.chat.completions.create({
                  model,
                  messages: [
                    { role: 'system', content: assemblyResult.layers[0]?.content || '' },
                    ...convertToOpenAIFormat(prunedMessages)
                  ],
                  tools: config.tools
                });
                return call;
              } catch (error: unknown) {
                if (error.message?.includes('token') || error.code === 'context_length_exceeded') {
                  console.error(`[Budget Enforcer] Token limit exceeded. Original request: ${estimatedTokens} tokens`);
                  throw new Error(`Context budget exceeded. Request was ${estimatedTokens} tokens, max is ${getBudgetForModel(model)}.`);
                }
                throw error;
              }
            },
            { agentId: config.agentId, model },
            { priority: rateLimiterPriority, burstSensitive: rateLimiterPriority !== 'P0' }
          );
        }),
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
  
  const message = response.choices[0].message;
  
  // Step 6: Log telemetry
  const duration = Date.now() - startTime;
  console.log(`[OpenClaw] Request completed in ${duration}ms using ${modelUsed} (${duplicateStatus})`);
  if (fallbackAttempts) {
    console.log(`[OpenClaw] Fallback attempts: ${fallbackAttempts.map(a => `${a.model}:${a.success ? 'ok' : 'fail'}`).join(', ')}`);
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
export { wrapToolExecution };

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
