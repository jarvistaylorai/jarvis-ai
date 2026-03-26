/**
 * Context Assembly Service
 * Phase 2: Production-grade context management with 7-layer system
 */

import { PrismaClient, type agents } from '@prisma/client';
import { 
  checkBudget, 
  enforceBudget, 
  estimateTokens,
  MODEL_BUDGETS,
  type BudgetStatus 
} from '@/lib/context/budgetEnforcer';
import { computePromptFingerprints, type FingerprintLayer } from '@/lib/context/promptFingerprint';
import { contextCache } from '@/lib/context/contextCache';
import { memoryService } from '@/lib/services/memoryService';

const MEMORY_KEYWORDS = [
  'system',
  'mission',
  'safety',
  'principle',
  'operating',
  'orchestrator',
  'platform',
  'scope',
  'directive',
  'policy',
  'canonical',
  'memory',
  'jarvis'
];

const MAX_CANONICAL_SEGMENTS = 2;
const MAX_SEGMENT_CHARS = 800;

const prisma = new PrismaClient();

// Layer definitions
export interface ContextLayer {
  name: string;
  priority: number;           // Lower = more important (kept longer)
  maxTokens: number;
  required: boolean;            // Must be present
  content: string;
  tokens: number;
  fingerprint?: string;
  reused?: boolean;
}

interface CanonicalMemoryStats {
  used: boolean;
  matchCount: number;
  files: string[];
}

export interface ContextAssemblyRequest {
  agentId: string;
  taskId?: string;
  userMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  model: string;
  workspaceId?: string;
  projectId?: string;
  requiredFiles?: string[];
}

export interface ContextAssemblyResult {
  layers: ContextLayer[];
  assembledPrompt: string;
  metadata: {
    totalTokens: number;
    budgetTokens: number;
    percentUsed: number;
    pressureLevel: BudgetStatus['pressureLevel'];
    wasTruncated: boolean;
    excludedLayers: string[];
    model: string;
    recommendedModel?: string;
    fingerprints: ReturnType<typeof computePromptFingerprints>;
    reusedLayers: string[];
    canonicalMemoryUsed: boolean;
    canonicalMemoryMatches: number;
    canonicalMemoryFiles: string[];
  };
}

/**
 * The 7-Layer Context System
 * 
 * Layer 0: System/Core Instructions (1k tokens) - NEVER excluded
 * Layer 1: Active Task (2k tokens) - Required
 * Layer 2: Recent Conversation (3k tokens) - Required but pruned
 * Layer 3: Retrieved Memory (2k tokens) - Optional, retrieved on-demand
 * Layer 4: Tool Results (2k tokens) - Required but summarized
 * Layer 5: Historical Summary (1.5k tokens) - Optional
 * Layer 6: File Excerpts (2.5k tokens) - Optional, retrieved on-demand
 */
export class ContextAssemblyService {
  
  /**
   * Main assembly method
   * Assembles context from all layers with budget enforcement
   */
  async assemble(request: ContextAssemblyRequest): Promise<ContextAssemblyResult> {
    const modelBudget = MODEL_BUDGETS[request.model] || MODEL_BUDGETS['kimi-k2.5'];
    
    const agentRecord = await prisma.agents.findUnique({ where: { id: request.agentId } });
    const memoryLayer = await this.buildLayer3(request, agentRecord);

    // Build all layers
    const layers: ContextLayer[] = [
      await this.buildLayer0(request, agentRecord),
      await this.buildLayer1(request),
      await this.buildLayer2(request),
      memoryLayer.layer,
      await this.buildLayer4(request),
      await this.buildLayer5(request),
      await this.buildLayer6(request),
    ];
    
    // Calculate initial token count
    let totalTokens = layers.reduce((sum, layer) => sum + layer.tokens, 0);
    
    // Apply budget enforcement with degradation strategy
    const { finalLayers, excludedLayers, wasTruncated } = this.applyBudgetStrategy(
      layers,
      modelBudget.totalBudget,
      totalTokens
    );
    
    // Assemble final prompt
    const assembledPrompt = this.assemblePrompt(finalLayers, request.userMessage);
    
    // Fingerprinting & reuse detection
    const fingerprintLayers: FingerprintLayer[] = finalLayers.map((layer) => ({
      name: layer.name,
      content: layer.content,
    }));
    const fingerprints = computePromptFingerprints(fingerprintLayers, request.userMessage, assembledPrompt);
    const reusedLayers: string[] = [];

    for (const layer of finalLayers) {
      const hash = fingerprints.layerHashes[layer.name];
      if (!hash) continue;
      layer.fingerprint = hash;
      const reuse = contextCache.register(layer.name, hash, layer.tokens, request.agentId);
      layer.reused = reuse.reused;
      if (reuse.reused) {
        reusedLayers.push(layer.name);
      }
    }

    const canonicalLayerIncluded = finalLayers.some(
      (layer) => layer.name === 'memory' && layer.content.trim().length > 0
    );
    
    // Final budget check
    const budgetStatus = checkBudget(assembledPrompt, request.model);
    
    return {
      layers: finalLayers,
      assembledPrompt,
      metadata: {
        totalTokens: estimateTokens(assembledPrompt),
        budgetTokens: modelBudget.totalBudget,
        percentUsed: budgetStatus.percentUsed,
        pressureLevel: budgetStatus.pressureLevel,
        wasTruncated,
        excludedLayers,
        model: request.model,
        recommendedModel: budgetStatus.pressureLevel === 'critical' 
          ? this.suggestLargerModel(totalTokens)
          : undefined,
        fingerprints,
        reusedLayers,
        canonicalMemoryUsed: canonicalLayerIncluded && memoryLayer.stats.used,
        canonicalMemoryMatches: canonicalLayerIncluded ? memoryLayer.stats.matchCount : 0,
        canonicalMemoryFiles: canonicalLayerIncluded ? memoryLayer.stats.files : [],
      },
    };
  }
  
  /**
   * Layer 0: System/Core Instructions
   * Identity, capabilities, safety rules
   * NEVER excluded
   */
  private async buildLayer0(request: ContextAssemblyRequest, agent?: agents | null): Promise<ContextLayer> {
    const agentName = agent?.name || request.agentId;
    const handle = agent?.handle ? ` (${agent.handle})` : '';
    const roleLine = agent?.role ? `Role: ${agent.role}` : 'Role: Autonomous operator';
    const capabilities = Array.isArray(agent?.capability_tags) && agent.capability_tags.length > 0
      ? `Capabilities: ${agent.capability_tags.join(', ')}`
      : 'Capabilities: mission control, orchestration, execution';

    const content = `You are ${agentName}${handle}.
${roleLine}.
${capabilities}.
Obey safety rails, respect mission constraints, and only take actions you can justify.`;
    
    return {
      name: 'system',
      priority: 0,
      maxTokens: 1000,
      required: true,
      content,
      tokens: estimateTokens(content),
    };
  }
  
  /**
   * Layer 1: Active Task
   * Current task definition, acceptance criteria
   */
  private async buildLayer1(request: ContextAssemblyRequest): Promise<ContextLayer> {
    if (!request.taskId) {
      return {
        name: 'task',
        priority: 1,
        maxTokens: 2000,
        required: false,
        content: '',
        tokens: 0,
      };
    }
    
    // Fetch from database
    const task = await prisma.tasks.findUnique({
      where: { id: request.taskId },
    });
    
    const content = task 
      ? `Task: ${task.title}\nDescription: ${task.description || 'N/A'}\nStatus: ${task.status}`
      : '';
    
    return {
      name: 'task',
      priority: 1,
      maxTokens: 2000,
      required: true,
      content,
      tokens: estimateTokens(content),
    };
  }
  
  /**
   * Layer 2: Recent Conversation
   * Last N messages (pruned)
   */
  private async buildLayer2(request: ContextAssemblyRequest): Promise<ContextLayer> {
    const messages = request.conversationHistory || [];
    
    // Keep last 10 messages
    const recent = messages.slice(-10);
    const content = recent
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');
    
    return {
      name: 'conversation',
      priority: 2,
      maxTokens: 3000,
      required: true,
      content,
      tokens: estimateTokens(content),
    };
  }
  
  /**
   * Layer 3: Retrieved Memory
   * Relevant project/task memory from semantic search
   */
  private async buildLayer3(request: ContextAssemblyRequest, agent?: agents | null): Promise<{ layer: ContextLayer; stats: CanonicalMemoryStats }> {
    const stats: CanonicalMemoryStats = { used: false, matchCount: 0, files: [] };
    let content = '';

    const includeMemory = this.shouldIncludeCanonicalMemory(request, agent);

    if (includeMemory) {
      try {
        const query = request.userMessage?.trim() || 'system directives';
        const results = await memoryService.retrieve({
          query,
          agentId: request.agentId,
          limit: 3,
          minScore: 0.1,
        });

        const prioritized = results.filter((r) => (r.metadata?.file_name || '').toLowerCase() === 'memory.md');
        const searchPool = prioritized.length > 0 ? prioritized : results;
        const sections: string[] = [];

        for (const memory of searchPool) {
          if (sections.length >= MAX_CANONICAL_SEGMENTS) break;
          const fileName = memory.metadata?.file_name || memory.type || 'memory';
          const remainingSlots = MAX_CANONICAL_SEGMENTS - sections.length;
          const snippets = this.extractMemorySections(memory.content, query, remainingSlots);
          if (snippets.length === 0) continue;
          stats.files.push(fileName);
          stats.matchCount += snippets.length;
          for (const snippet of snippets) {
            sections.push(`Source: ${fileName}\n${snippet}`);
            if (sections.length >= MAX_CANONICAL_SEGMENTS) break;
          }
        }

        if (sections.length > 0) {
          stats.used = true;
          content = sections.slice(0, MAX_CANONICAL_SEGMENTS).join('\n\n---\n\n');
        }
      } catch (error) {
        console.warn('[Context Assembly] Canonical memory retrieval failed', error);
      }
    }

    const layer: ContextLayer = {
      name: 'memory',
      priority: 3,
      maxTokens: 2000,
      required: false,
      content,
      tokens: content ? estimateTokens(content) : 0,
    };

    return {
      layer,
      stats: {
        used: stats.used,
        matchCount: stats.used ? stats.matchCount : 0,
        files: stats.used ? Array.from(new Set(stats.files)) : [],
      },
    };
  }
  
  /**
   * Layer 4: Tool Results
   * Summarized tool outputs
   */
  private async buildLayer4(request: ContextAssemblyRequest): Promise<ContextLayer> {
    // TODO: Load from recent tool executions
    // For now, return empty (populated during execution)
    
    return {
      name: 'tools',
      priority: 4,
      maxTokens: 2000,
      required: true,
      content: '',
      tokens: 0,
    };
  }
  
  /**
   * Layer 5: Historical Summary
   * Compressed summary of older conversation
   */
  private async buildLayer5(request: ContextAssemblyRequest): Promise<ContextLayer> {
    // TODO: Generate from older conversation
    // For now, return empty (will be populated in Phase 3)
    
    return {
      name: 'history',
      priority: 5,
      maxTokens: 1500,
      required: false,
      content: '',
      tokens: 0,
    };
  }
  
  /**
   * Layer 6: File Excerpts
   * Relevant file sections retrieved on-demand
   */
  private async buildLayer6(request: ContextAssemblyRequest): Promise<ContextLayer> {
    // TODO: Retrieve from file index
    // For now, return empty (will be populated in Phase 3)
    
    return {
      name: 'files',
      priority: 6,
      maxTokens: 2500,
      required: false,
      content: '',
      tokens: 0,
    };
  }
  
  /**
   * Apply budget strategy with degradation
   * Removes lower-priority layers first
   */
  private applyBudgetStrategy(
    layers: ContextLayer[],
    budget: number,
    initialTokens: number
  ): { finalLayers: ContextLayer[]; excludedLayers: string[]; wasTruncated: boolean } {
    const finalLayers: ContextLayer[] = [];
    const excludedLayers: string[] = [];
    let currentTokens = 0;
    let wasTruncated = false;
    
    // Sort by priority (lower number = higher priority)
    const sortedLayers = [...layers].sort((a, b) => a.priority - b.priority);
    
    for (const layer of sortedLayers) {
      // Check if adding this layer would exceed budget
      if (currentTokens + layer.tokens > budget * 0.95) {
        // Skip non-required layers
        if (!layer.required) {
          excludedLayers.push(layer.name);
          continue;
        }
        
        // For required layers, try to truncate
        const remainingBudget = budget * 0.95 - currentTokens;
        if (remainingBudget > 100) {
          const truncated = this.truncateLayer(layer, remainingBudget);
          finalLayers.push(truncated);
          currentTokens += truncated.tokens;
          wasTruncated = true;
        } else {
          excludedLayers.push(layer.name);
        }
      } else {
        finalLayers.push(layer);
        currentTokens += layer.tokens;
      }
    }
    
    return { finalLayers, excludedLayers, wasTruncated };
  }
  
  /**
   * Truncate a layer to fit budget
   */
  private truncateLayer(layer: ContextLayer, maxTokens: number): ContextLayer {
    const maxChars = maxTokens * 4;
    const content = layer.content.slice(0, maxChars) + 
      '\n\n[... truncated to fit context budget ...]';
    
    return {
      ...layer,
      content,
      tokens: estimateTokens(content),
    };
  }
  
  /**
   * Assemble final prompt from layers
   */
  private assemblePrompt(layers: ContextLayer[], userMessage: string): string {
    const parts: string[] = [];
    
    // Add each layer with header
    for (const layer of layers) {
      if (!layer.content) continue;
      
      const header = `=== ${layer.name.toUpperCase()} ===`;
      parts.push(`${header}\n${layer.content}`);
    }
    
    // Add user message
    parts.push(`=== USER ===\n${userMessage}`);
    
    return parts.join('\n\n');
  }
  
  private shouldIncludeCanonicalMemory(request: ContextAssemblyRequest, agent?: agents | null): boolean {
    if (agent?.handle === 'orchestrator' || agent?.handle === 'mission-control') {
      return true;
    }

    const recentConversation = (request.conversationHistory || [])
      .slice(-5)
      .map((m) => m.content)
      .join(' ');

    const haystack = `${request.userMessage || ''} ${recentConversation}`.toLowerCase();
    return MEMORY_KEYWORDS.some((keyword) => haystack.includes(keyword));
  }

  private extractMemorySections(content: string, query: string, maxSections: number = MAX_CANONICAL_SEGMENTS): string[] {
    const normalized = content.replace(/\r\n/g, '\n');
    const sections = normalized.split(/\n(?=## )/g).map((section) => section.trim()).filter(Boolean);
    const keywords = this.buildKeywordList(query);

    const scored = (sections.length > 0 ? sections : [normalized])
      .map((section) => {
        const lower = section.toLowerCase();
        const score = keywords.reduce((acc, keyword) => acc + (lower.includes(keyword) ? 1 : 0), 0);
        return { section: section.slice(0, MAX_SEGMENT_CHARS).trim(), score };
      });

    const positive = scored.filter((entry) => entry.score > 0);
    const pool = (positive.length > 0 ? positive : scored)
      .sort((a, b) => {
        if (b.score === a.score) {
          return b.section.length - a.section.length;
        }
        return b.score - a.score;
      });

    const limit = Math.max(1, maxSections);
    return pool.slice(0, limit).map((entry) => entry.section).filter(Boolean);
  }

  private buildKeywordList(query: string): string[] {
    const base = (query || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 3);

    return Array.from(new Set([...base, ...MEMORY_KEYWORDS]));
  }

  /**
   * Suggest larger model if budget exceeded
   */
  private suggestLargerModel(tokens: number): string {
    if (tokens < 180000) return 'claude-3.7-sonnet';
    if (tokens < 800000) return 'gemini-1.5-pro';
    return 'gemini-1.5-pro'; // No larger option
  }
}

// Singleton instance
export const contextAssemblyService = new ContextAssemblyService();