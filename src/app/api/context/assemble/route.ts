/**
 * Context Assembly API
 * Emergency Patch: On-demand context assembly with budget enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  checkBudget, 
  enforceBudget, 
  suggestModel,
  logBudgetStatus 
} from '@/lib/context/budgetEnforcer';

interface AssembleRequest {
  agentId: string;
  taskId?: string;
  userMessage: string;
  conversationHistory?: Array<{
    role: string;
    content: string;
  }>;
  model?: string;
  workspaceId?: string;
}

interface AssembleResponse {
  systemPrompt: string;
  taskContext: string;
  recentConversation: string;
  retrievedMemories: string[];
  toolResults: string[];
  historicalSummary: string;
  fileExcerpts: string[];
  metadata: {
    totalTokens: number;
    budgetTokens: number;
    percentUsed: number;
    pressureLevel: string;
    model: string;
    recommendedModel?: string;
    wasTruncated: boolean;
    layersIncluded: string[];
    layersExcluded: string[];
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: AssembleRequest = await request.json();
    const { 
      agentId, 
      taskId, 
      userMessage, 
      conversationHistory = [],
      model = 'kimi-k2.5',
      workspaceId = 'business'
    } = body;

    // Layer 0: System prompt (distilled from SOUL.md)
    const systemPrompt = await getSystemPrompt(agentId);

    // Layer 1: Task context (from database)
    const taskContext = await getTaskContext(taskId);

    // Layer 2: Recent conversation (pruned)
    const recentConversation = formatConversation(
      conversationHistory.slice(-10)
    );

    // Layer 3-6: Placeholders for now (will be implemented in Phase 2)
    const retrievedMemories: string[] = [];
    const toolResults: string[] = [];
    const historicalSummary = '';
    const fileExcerpts: string[] = [];

    // Assemble full context
    const fullContext = assembleContext({
      systemPrompt,
      taskContext,
      recentConversation,
      retrievedMemories,
      toolResults,
      historicalSummary,
      fileExcerpts,
      userMessage,
    });

    // Check budget
    const budgetStatus = checkBudget(fullContext, model);
    
    // If over budget, enforce truncation
    let finalContext = fullContext;
    let wasTruncated = false;
    let recommendedModel: string | undefined;
    
    if (!budgetStatus.withinBudget) {
      const enforcement = enforceBudget(fullContext, model);
      finalContext = enforcement.content;
      wasTruncated = enforcement.wasTruncated;
      recommendedModel = suggestModel(budgetStatus.currentTokens);
    }

    // Log for monitoring
    logBudgetStatus(budgetStatus, model, `assemble for ${agentId}`);

    // Build response
    const response: AssembleResponse = {
      systemPrompt,
      taskContext,
      recentConversation,
      retrievedMemories,
      toolResults,
      historicalSummary,
      fileExcerpts,
      metadata: {
        totalTokens: budgetStatus.currentTokens,
        budgetTokens: budgetStatus.budgetTokens,
        percentUsed: budgetStatus.percentUsed,
        pressureLevel: budgetStatus.pressureLevel,
        model,
        recommendedModel,
        wasTruncated,
        layersIncluded: ['system', 'task', 'recentConversation'],
        layersExcluded: budgetStatus.pressureLevel === 'critical' 
          ? ['retrievedMemories', 'toolResults', 'historicalSummary', 'fileExcerpts']
          : [],
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Context Assembly API Error]', error);
    return NextResponse.json(
      { error: 'Failed to assemble context', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Get distilled system prompt
 * TODO: Load from database or config instead of full SOUL.md
 */
async function getSystemPrompt(agentId: string): Promise<string> {
  // For now, return a distilled version
  // In Phase 2, this should load from a database table
  return `You are ${agentId}, an AI assistant. Be helpful, concise, and accurate.`;
}

/**
 * Get task context from database
 * TODO: Load from tasks table
 */
async function getTaskContext(taskId?: string): Promise<string> {
  if (!taskId) return '';
  
  // For now, return placeholder
  // In Phase 2, query tasks table
  return `Task: ${taskId}`;
}

/**
 * Format conversation history
 */
function formatConversation(messages: Array<{ role: string; content: string }>): string {
  return messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');
}

/**
 * Assemble full context from layers
 */
function assembleContext(layers: {
  systemPrompt: string;
  taskContext: string;
  recentConversation: string;
  retrievedMemories: string[];
  toolResults: string[];
  historicalSummary: string;
  fileExcerpts: string[];
  userMessage: string;
}): string {
  const parts: string[] = [];
  
  if (layers.systemPrompt) {
    parts.push(`=== SYSTEM ===\n${layers.systemPrompt}`);
  }
  
  if (layers.taskContext) {
    parts.push(`=== TASK ===\n${layers.taskContext}`);
  }
  
  if (layers.historicalSummary) {
    parts.push(`=== PREVIOUS CONTEXT ===\n${layers.historicalSummary}`);
  }
  
  if (layers.retrievedMemories.length > 0) {
    parts.push(`=== RELEVANT MEMORY ===\n${layers.retrievedMemories.join('\n\n')}`);
  }
  
  if (layers.fileExcerpts.length > 0) {
    parts.push(`=== FILE EXCERPTS ===\n${layers.fileExcerpts.join('\n\n')}`);
  }
  
  if (layers.toolResults.length > 0) {
    parts.push(`=== TOOL RESULTS ===\n${layers.toolResults.join('\n\n')}`);
  }
  
  if (layers.recentConversation) {
    parts.push(`=== CONVERSATION ===\n${layers.recentConversation}`);
  }
  
  parts.push(`=== USER MESSAGE ===\n${layers.userMessage}`);
  
  return parts.join('\n\n');
}