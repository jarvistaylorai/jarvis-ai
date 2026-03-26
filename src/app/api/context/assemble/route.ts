/**
 * Context Assembly API
 * On-demand context assembly wired into the canonical pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { logBudgetStatus, suggestModel } from '@/lib/context/budgetEnforcer';
import { contextAssemblyService, type ContextLayer } from '@/lib/services/contextAssemblyService';

const prisma = new PrismaClient();
const MEMORY_SEPARATOR = /\n+---\n+/;

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
    modelSuggested?: string;
    wasTruncated: boolean;
    layersIncluded: string[];
    layersExcluded: string[];
    agentResolution: string;
    retrievedMemoryCount: number;
    memoryConfidence: number;
    assembledAt: string;
    canonicalMemoryUsed: boolean;
    canonicalMemoryMatches: number;
    canonicalMemoryFiles: string[];
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
      workspaceId = 'business',
    } = body;

    let finalAgentId = agentId;
    let agentResolution: 'exact_match' | 'fallback_to_orchestrator' = 'exact_match';

    if (finalAgentId) {
      const exists = await prisma.agents.findUnique({ where: { id: finalAgentId } });
      if (!exists) finalAgentId = '';
    }

    if (!finalAgentId) {
      const orchestrator = await prisma.agents.findFirst({ where: { handle: 'orchestrator' } });
      if (!orchestrator) throw new Error('Missing orchestrator default agent');
      finalAgentId = orchestrator.id;
      agentResolution = 'fallback_to_orchestrator';
    }

    const assembly = await contextAssemblyService.assemble({
      agentId: finalAgentId,
      taskId,
      userMessage,
      conversationHistory,
      model,
      workspaceId,
    });

    const systemPrompt = getLayerContent(assembly.layers, 'system');
    const taskContext = getLayerContent(assembly.layers, 'task');
    const recentConversation = getLayerContent(assembly.layers, 'conversation');
    const memoryLayer = getLayerContent(assembly.layers, 'memory');
    const toolsLayer = getLayerContent(assembly.layers, 'tools');
    const historyLayer = getLayerContent(assembly.layers, 'history');
    const fileLayer = getLayerContent(assembly.layers, 'files');

    const retrievedMemories = splitLayerEntries(memoryLayer);
    const toolResults = splitLayerEntries(toolsLayer);
    const fileExcerpts = splitLayerEntries(fileLayer);
    const historicalSummary = historyLayer;

    const budgetSnapshot = {
      withinBudget: assembly.metadata.percentUsed <= 100,
      currentTokens: assembly.metadata.totalTokens,
      budgetTokens: assembly.metadata.budgetTokens,
      percentUsed: assembly.metadata.percentUsed,
      pressureLevel: assembly.metadata.pressureLevel,
    };

    logBudgetStatus(budgetSnapshot, model, `assemble for ${finalAgentId}`);

    const response: AssembleResponse = {
      systemPrompt,
      taskContext,
      recentConversation,
      retrievedMemories,
      toolResults,
      historicalSummary,
      fileExcerpts,
      metadata: {
        totalTokens: assembly.metadata.totalTokens,
        budgetTokens: assembly.metadata.budgetTokens,
        percentUsed: assembly.metadata.percentUsed,
        pressureLevel: assembly.metadata.pressureLevel,
        model,
        recommendedModel: assembly.metadata.recommendedModel,
        modelSuggested: suggestModel(assembly.metadata.totalTokens),
        wasTruncated: assembly.metadata.wasTruncated,
        layersIncluded: assembly.layers.map((layer) => layer.name),
        layersExcluded: assembly.metadata.excludedLayers,
        agentResolution,
        retrievedMemoryCount: retrievedMemories.length,
        memoryConfidence: retrievedMemories.length > 0 ? 1 : 0,
        assembledAt: new Date().toISOString(),
        canonicalMemoryUsed: assembly.metadata.canonicalMemoryUsed,
        canonicalMemoryMatches: assembly.metadata.canonicalMemoryMatches,
        canonicalMemoryFiles: assembly.metadata.canonicalMemoryFiles,
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

function getLayerContent(layers: ContextLayer[], name: string): string {
  return layers.find((layer) => layer.name === name)?.content || '';
}

function splitLayerEntries(content: string): string[] {
  if (!content || !content.trim()) return [];
  const parts = content.split(MEMORY_SEPARATOR).map((entry) => entry.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [content.trim()];
}
