/**
 * Context Budget Enforcement
 * Emergency Patch #1: Hard token limits to prevent overflows
 */

export interface ModelBudget {
  model: string;
  totalBudget: number;
  warningThreshold: number;  // 80%
  criticalThreshold: number;   // 95%
}

export interface BudgetStatus {
  withinBudget: boolean;
  currentTokens: number;
  budgetTokens: number;
  percentUsed: number;
  pressureLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction?: string;
}

// Hard limits for each model
export const MODEL_BUDGETS: Record<string, ModelBudget> = {
  'openrouter/auto': {
    model: 'openrouter/auto',
    totalBudget: 200000,
    warningThreshold: 0.75,
    criticalThreshold: 0.9,
  },
  'kimi-k2.5': {
    model: 'kimi-k2.5',
    totalBudget: 100000,      // Leave 28k for output
    warningThreshold: 0.8,
    criticalThreshold: 0.95,
  },
  'claude-3.7-sonnet': {
    model: 'claude-3.7-sonnet',
    totalBudget: 180000,      // Leave 20k for output
    warningThreshold: 0.85,
    criticalThreshold: 0.95,
  },
  'claude-3.7-opus': {
    model: 'claude-3.7-opus',
    totalBudget: 180000,
    warningThreshold: 0.85,
    criticalThreshold: 0.95,
  },
  'gemini-1.5-pro': {
    model: 'gemini-1.5-pro',
    totalBudget: 800000,      // Leave 200k for output
    warningThreshold: 0.75,
    criticalThreshold: 0.90,
  },
  'gpt-4': {
    model: 'gpt-4',
    totalBudget: 120000,
    warningThreshold: 0.8,
    criticalThreshold: 0.95,
  },
};

// Default to OpenRouter auto budget if model not found
const DEFAULT_BUDGET: ModelBudget = MODEL_BUDGETS['openrouter/auto'];

/**
 * Estimate token count from text
 * Rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Check if content is within budget for a model
 */
export function checkBudget(
  content: string,
  model: string = 'kimi-k2.5'
): BudgetStatus {
  const budget = MODEL_BUDGETS[model] || DEFAULT_BUDGET;
  const currentTokens = estimateTokens(content);
  const percentUsed = currentTokens / budget.totalBudget;
  
  let pressureLevel: BudgetStatus['pressureLevel'] = 'low';
  let recommendedAction: string | undefined;
  
  if (percentUsed >= budget.criticalThreshold) {
    pressureLevel = 'critical';
    recommendedAction = 'EMERGENCY: Content must be truncated immediately';
  } else if (percentUsed >= budget.warningThreshold) {
    pressureLevel = 'high';
    recommendedAction = 'WARNING: Consider reducing context or upgrading model';
  } else if (percentUsed >= 0.6) {
    pressureLevel = 'medium';
  }
  
  return {
    withinBudget: percentUsed < 1.0,
    currentTokens,
    budgetTokens: budget.totalBudget,
    percentUsed: Math.round(percentUsed * 100),
    pressureLevel,
    recommendedAction,
  };
}

/**
 * Enforce budget by truncating content if necessary
 * Emergency truncation: keep first 30% and last 20%, add truncation notice
 */
export function enforceBudget(
  content: string,
  model: string = 'kimi-k2.5',
  reserveTokens: number = 500  // Reserve space for truncation notice
): { content: string; wasTruncated: boolean; originalTokens: number; finalTokens: number } {
  const budget = MODEL_BUDGETS[model] || DEFAULT_BUDGET;
  const maxTokens = budget.totalBudget - reserveTokens;
  const currentTokens = estimateTokens(content);
  
  if (currentTokens <= maxTokens) {
    return {
      content,
      wasTruncated: false,
      originalTokens: currentTokens,
      finalTokens: currentTokens,
    };
  }
  
  // Emergency truncation
  const maxChars = maxTokens * 4;
  const keepFirst = Math.floor(maxChars * 0.3);
  const keepLast = Math.floor(maxChars * 0.2);
  
  const firstPart = content.slice(0, keepFirst);
  const lastPart = content.slice(-keepLast);
  const truncatedChars = content.length - keepFirst - keepLast;
  const truncatedTokens = Math.floor(truncatedChars / 4);
  
  const truncatedContent = `${firstPart}\n\n[... CONTENT TRUNCATED: ${truncatedTokens} tokens removed to fit context budget ...]\n\n${lastPart}`;
  
  return {
    content: truncatedContent,
    wasTruncated: true,
    originalTokens: currentTokens,
    finalTokens: estimateTokens(truncatedContent),
  };
}

/**
 * Get the best model for a given token requirement
 * Quick routing for emergency use
 */
export function suggestModel(estimatedTokens: number): string {
  const defaultModel = 'openrouter/auto';
  const budget = MODEL_BUDGETS[defaultModel];
  if (!budget || estimatedTokens <= budget.totalBudget * 0.9) {
    return defaultModel;
  }
  return defaultModel;
}

/**
 * Log budget status for monitoring
 */
export function logBudgetStatus(status: BudgetStatus, model: string, context: string): void {
  console.log(`[Context Budget] ${model} | ${status.pressureLevel.toUpperCase()} | ${status.percentUsed}% used (${status.currentTokens}/${status.budgetTokens} tokens) | Context: ${context}`);
  
  if (status.pressureLevel === 'critical') {
    console.error(`[Context Budget] CRITICAL: ${status.recommendedAction}`);
    // TODO: Emit telemetry event for Mission Control
  } else if (status.pressureLevel === 'high') {
    console.warn(`[Context Budget] WARNING: ${status.recommendedAction}`);
  }
}