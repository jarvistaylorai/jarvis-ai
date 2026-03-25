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
  ModelRoute 
} from '@/lib/models/quickRouter';
import { contextAssemblyService, type ContextAssemblyRequest, type ContextAssemblyResult } from '@/lib/services/contextAssemblyService';
import { executeWithModelFallback } from '@/lib/ai/modelRouter';
import { promptCache, type DuplicateStatus } from '@/lib/llm/promptCache';
import { hashNormalized } from '@/lib/context/promptFingerprint';

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
  tools?: any[];
  workspaceId?: string;
}

export interface PatchedOpenClawResponse {
  content: string;
  toolCalls?: any[];
  modelUsed: string;
  wasRouted: boolean;
  routingReason: string;
  budgetStatus: BudgetStatus;
  contextLayers: string[];
  excludedLayers: string[];
  wasTruncated: boolean;
  originalModel: string;
  duplicateStatus: DuplicateStatus;
  promptHash: string;
  fingerprints: ContextAssemblyResult['metadata']['fingerprints'];
  reusedLayers: string[];
}

/**
 * Task 1: Wrap Tool Execution with Output Summarization
 * 
 * Applies 500-token limit to all tool outputs before they reach context
 */
export function wrapToolExecution(
  originalExecute: (call: any, agent: any) => Promise<string>
): (call: any, agent: any) => Promise<string> {
  return async (call: any, agent: any): Promise<string> => {
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
  openclawClient: any
): Promise<PatchedOpenClawResponse> {
  const startTime = Date.now();
  
  // Step 1: Determine optimal model (quick routing)
  const estimatedTokens = estimateTokensFromMessages(config.messages);
  const route = quickRoute({
    estimatedTokens,
    taskType: inferTaskType(config.tools),
    preferredModel: config.model
  });
  
  const preferredModel = route.model;
  const wasRouted = preferredModel !== config.model;
  
  console.log(`[Model Router] ${config.model || 'auto'} → ${preferredModel} (${route.reason})`);
  
  // Step 2: Prune conversation history
  const { messages: prunedMessages, wasPruned, summary } = pruneMessages(
    config.messages,
    { maxMessages: 10 }
  );
  
  if (wasPruned) {
    console.log(`[Conversation Pruner] Reduced to ${prunedMessages.length} messages, summary: ${summary?.substring(0, 50)}...`);
  }
  
  // Step 3: Assemble context with budget enforcement
  const assemblyResult = await contextAssemblyService.assemble({
    agentId: config.agentId,
    taskId: config.taskId,
    userMessage: getLastUserMessage(prunedMessages),
    conversationHistory: prunedMessages,
    model: preferredModel,
    workspaceId: config.workspaceId || 'business'
  });
  
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
        executeWithModelFallback(preferredModel, async (model) => {
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
          } catch (error: any) {
            if (error.message?.includes('token') || error.code === 'context_length_exceeded') {
              console.error(`[Budget Enforcer] Token limit exceeded. Original request: ${estimatedTokens} tokens`);
              throw new Error(`Context budget exceeded. Request was ${estimatedTokens} tokens, max is ${getBudgetForModel(model)}.`);
            }
            throw error;
          }
        }),
      { allowReplay, estTokens: assemblyResult.metadata.totalTokens }
    );

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
  
  return {
    content: message.content || '',
    toolCalls: message.tool_calls,
    modelUsed,
    wasRouted,
    routingReason: route.reason,
    budgetStatus,
    contextLayers: assemblyResult.layers.map(l => l.name),
    excludedLayers: assemblyResult.metadata.excludedLayers,
    wasTruncated: assemblyResult.metadata.wasTruncated,
    originalModel: config.model || 'auto',
    duplicateStatus,
    promptHash: assemblyResult.metadata.fingerprints.finalHash,
    fingerprints: assemblyResult.metadata.fingerprints,
    reusedLayers: assemblyResult.metadata.reusedLayers,
  };
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
function inferTaskType(tools?: any[]): 'coding' | 'analysis' | 'conversation' {
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
