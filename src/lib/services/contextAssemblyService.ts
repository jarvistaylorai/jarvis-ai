/**
 * Context Assembly Service
 * Phase 2: Production-grade context management with 7-layer system
 */

import { PrismaClient } from '@prisma/client';
import { 
  checkBudget, 
  enforceBudget, 
  estimateTokens,
  MODEL_BUDGETS,
  type BudgetStatus 
} from '@/lib/context/budgetEnforcer';
import { computePromptFingerprints, type FingerprintLayer } from '@/lib/context/promptFingerprint';
import { contextCache } from '@/lib/context/contextCache';

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
    
    // Build all layers
    const layers: ContextLayer[] = [
      await this.buildLayer0(request),
      await this.buildLayer1(request),
      await this.buildLayer2(request),
      await this.buildLayer3(request),
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
      },
    };
  }
  
  /**
   * Layer 0: System/Core Instructions
   * Identity, capabilities, safety rules
   * NEVER excluded
   */
  private async buildLayer0(request: ContextAssemblyRequest): Promise<ContextLayer> {
    // TODO: Load from database instead of file
    const content = `You are ${request.agentId}, an AI assistant. 
Be helpful, concise, and accurate. 
Follow safety guidelines. 
Use tools when appropriate.`;
    
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
  private async buildLayer3(request: ContextAssemblyRequest): Promise<ContextLayer> {
    // TODO: Implement semantic retrieval
    // For now, return empty (will be populated in Phase 3)
    
    return {
      name: 'memory',
      priority: 3,
      maxTokens: 2000,
      required: false,
      content: '',
      tokens: 0,
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