/**
 * Quick Model Router
 * Emergency Patch #4: Route large jobs away from Kimi
 */

import { MODEL_BUDGETS, estimateTokens } from '@/lib/context/budgetEnforcer';

export interface RouteRequest {
  estimatedTokens: number;
  taskType?: TaskType;
  requireToolUse?: boolean;
  requireJsonMode?: boolean;
  latencyRequirement?: 'fast' | 'standard' | 'slow_ok';
  costSensitivity?: 'low' | 'medium' | 'high';
  preferredModel?: string;
}

export interface RouteResult {
  model: string;
  provider: string;
  reason: string;
  estimatedCost: number;
  fallbackChain: string[];
  warnings: string[];
}

export type TaskType = 
  | 'coding'
  | 'review'
  | 'architecture'
  | 'writing'
  | 'analysis'
  | 'qa'
  | 'general';

// Simple routing rules (in priority order)
const ROUTING_RULES: Array<{
  name: string;
  condition: (req: RouteRequest) => boolean;
  model: string;
  reason: string;
}> = [
  {
    name: 'tiny_tasks',
    condition: (req) => req.estimatedTokens < 8000,
    model: 'kimi-k2.5',
    reason: 'Small task, use fast/cheap model',
  },
  {
    name: 'coding_standard',
    condition: (req) => 
      req.taskType === 'coding' && 
      req.estimatedTokens < 80000,
    model: 'claude-3.7-sonnet',
    reason: 'Coding task, use best coding model',
  },
  {
    name: 'review_tasks',
    condition: (req) => 
      req.taskType === 'review' && 
      req.estimatedTokens < 80000,
    model: 'claude-3.7-sonnet',
    reason: 'Code review, needs strong reasoning',
  },
  {
    name: 'architecture_design',
    condition: (req) => req.taskType === 'architecture',
    model: 'claude-3.7-opus',
    reason: 'Complex architecture, use best reasoning model',
  },
  {
    name: 'large_context',
    condition: (req) => req.estimatedTokens > 80000,
    model: 'gemini-1.5-pro',
    reason: 'Large context, use Gemini',
  },
  {
    name: 'cost_sensitive',
    condition: (req) => 
      req.costSensitivity === 'high' && 
      req.estimatedTokens < 16000,
    model: 'kimi-k2.5',
    reason: 'Cost sensitive, use cheapest option',
  },
];

// Fallback chains
const FALLBACK_CHAINS: Record<string, string[]> = {
  'kimi-k2.5': ['claude-3.7-sonnet'],
  'claude-3.7-sonnet': ['gemini-1.5-pro', 'claude-3.7-opus'],
  'claude-3.7-opus': ['gemini-1.5-pro'],
  'gemini-1.5-pro': ['claude-3.7-opus'],
};

// Provider mapping
const PROVIDER_MAP: Record<string, string> = {
  'kimi-k2.5': 'ollama',
  'claude-3.7-sonnet': 'anthropic',
  'claude-3.7-opus': 'anthropic',
  'gemini-1.5-pro': 'google',
  'gpt-4': 'openai',
};

// Cost estimates (per 1k tokens input + output avg)
export const COST_ESTIMATES: Record<string, number> = {
  'kimi-k2.5': 0,  // Local
  'claude-3.7-sonnet': 0.009,  // $3 input + $15 output / 2
  'claude-3.7-opus': 0.0225,   // $15 input + $30 output / 2
  'gemini-1.5-pro': 0.003125,  // $1.25 input + $5 output / 2
  'gpt-4': 0.015,              // $30 input + $60 output / 2
};

/**
 * Quick route a request to the appropriate model
 */
export function quickRoute(request: RouteRequest): RouteResult {
  const warnings: string[] = [];
  
  // Check if preferred model can handle it
  if (request.preferredModel) {
    const budget = MODEL_BUDGETS[request.preferredModel];
    if (budget && request.estimatedTokens > budget.totalBudget) {
      warnings.push(`Preferred model ${request.preferredModel} cannot handle ${request.estimatedTokens} tokens`);
    } else if (budget) {
      // Preferred model is fine
      return {
        model: request.preferredModel,
        provider: PROVIDER_MAP[request.preferredModel] || 'unknown',
        reason: 'User preferred model (within budget)',
        estimatedCost: (request.estimatedTokens / 1000) * COST_ESTIMATES[request.preferredModel],
        fallbackChain: FALLBACK_CHAINS[request.preferredModel] || [],
        warnings,
      };
    }
  }
  
  // Apply routing rules
  for (const rule of ROUTING_RULES) {
    if (rule.condition(request)) {
      const budget = MODEL_BUDGETS[rule.model];
      if (budget && request.estimatedTokens <= budget.totalBudget) {
        return {
          model: rule.model,
          provider: PROVIDER_MAP[rule.model] || 'unknown',
          reason: rule.reason,
          estimatedCost: (request.estimatedTokens / 1000) * COST_ESTIMATES[rule.model],
          fallbackChain: FALLBACK_CHAINS[rule.model] || [],
          warnings,
        };
      }
    }
  }
  
  // Default to Gemini for very large requests
  if (request.estimatedTokens > 500000) {
    warnings.push('Request exceeds practical limits, consider chunking');
  }
  
  return {
    model: 'gemini-1.5-pro',
    provider: 'google',
    reason: 'Default for unmatched requests',
    estimatedCost: (request.estimatedTokens / 1000) * COST_ESTIMATES['gemini-1.5-pro'],
    fallbackChain: FALLBACK_CHAINS['gemini-1.5-pro'] || [],
    warnings,
  };
}

/**
 * Estimate tokens for content and route
 */
export function routeContent(
  content: string,
  options: Omit<RouteRequest, 'estimatedTokens'> = {}
): RouteResult {
  const estimatedTokens = estimateTokens(content);
  return quickRoute({ ...options, estimatedTokens });
}

/**
 * Check if a model can handle a request
 */
export function canHandle(
  model: string,
  estimatedTokens: number
): { canHandle: boolean; headroom: number; percentUsed: number } {
  const budget = MODEL_BUDGETS[model];
  if (!budget) {
    return { canHandle: false, headroom: 0, percentUsed: 100 };
  }
  
  const headroom = budget.totalBudget - estimatedTokens;
  const percentUsed = (estimatedTokens / budget.totalBudget) * 100;
  
  return {
    canHandle: estimatedTokens <= budget.totalBudget,
    headroom,
    percentUsed,
  };
}

/**
 * Log routing decision
 */
export function logRouting(result: RouteResult, request: RouteRequest): void {
  console.log(`[Model Router] ${request.taskType || 'general'} | ${request.estimatedTokens} tokens → ${result.model} | Reason: ${result.reason} | Est. Cost: $${result.estimatedCost.toFixed(4)}`);
  
  if (result.warnings.length > 0) {
    console.warn(`[Model Router] Warnings: ${result.warnings.join(', ')}`);
  }
}

export function estimateModelCost(model: string, estimatedTokens: number): number {
  const rate = COST_ESTIMATES[model] ?? COST_ESTIMATES['claude-3.7-sonnet'];
  return (estimatedTokens / 1000) * rate;
}

export function getProviderForModel(model: string): string {
  return PROVIDER_MAP[model] || 'unknown';
}

/**
 * Get routing recommendation for UI
 */
export function getRoutingRecommendation(request: RouteRequest): {
  primary: RouteResult;
  alternatives: Array<{ model: string; reason: string; costDelta: number }>;
} {
  const primary = quickRoute(request);
  const alternatives: Array<{ model: string; reason: string; costDelta: number }> = [];
  
  // Check alternative models
  const allModels = Object.keys(MODEL_BUDGETS);
  for (const model of allModels) {
    if (model === primary.model) continue;
    
    const check = canHandle(model, request.estimatedTokens);
    if (check.canHandle) {
      const cost = estimateModelCost(model, request.estimatedTokens);
      alternatives.push({
        model,
        reason: check.percentUsed < 50 ? 'Plenty of headroom' : 'Within budget',
        costDelta: cost - primary.estimatedCost,
      });
    }
  }
  
  // Sort by cost
  alternatives.sort((a, b) => a.costDelta - b.costDelta);
  
  return { primary, alternatives: alternatives.slice(0, 3) };
}