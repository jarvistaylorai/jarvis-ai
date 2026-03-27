/**
 * Quick Model Router
 * OpenRouter Edition — routes every request through OpenRouter with optional overrides.
 */

import { MODEL_BUDGETS, estimateTokens } from '@/lib/context/budgetEnforcer';

export interface RouteRequest {
  estimatedTokens: number;
  taskType?: TaskType;
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

const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL || 'openrouter/auto';
const DEFAULT_COST_PER_KTOK = Number(process.env.OPENROUTER_DEFAULT_COST_PER_KTOK ?? 0.0125);

function uniqueChain(models: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const model of models) {
    if (!model) continue;
    if (seen.has(model)) continue;
    seen.add(model);
    ordered.push(model);
  }
  return ordered;
}

export function quickRoute(request: RouteRequest): RouteResult {
  const preferred = request.preferredModel?.trim();
  const model = preferred || DEFAULT_MODEL;
  const warnings: string[] = [];

  const budget = MODEL_BUDGETS[model];
  if (budget && request.estimatedTokens > budget.totalBudget) {
    warnings.push(`Estimated ${request.estimatedTokens} tokens exceeds ${model} budget (${budget.totalBudget})`);
  }

  const fallbackChain = uniqueChain([
    preferred && preferred !== DEFAULT_MODEL ? DEFAULT_MODEL : undefined,
  ]);

  return {
    model,
    provider: 'openrouter',
    reason: preferred ? 'preferred-model' : 'openrouter-auto',
    estimatedCost: estimateModelCost(model, request.estimatedTokens),
    fallbackChain,
    warnings,
  };
}

export function routeContent(
  content: string,
  options: Omit<RouteRequest, 'estimatedTokens'> = {}
): RouteResult {
  const estimatedTokens = estimateTokens(content);
  return quickRoute({ ...options, estimatedTokens });
}

export function canHandle(
  model: string,
  estimatedTokens: number
): { canHandle: boolean; headroom: number; percentUsed: number } {
  const budget = MODEL_BUDGETS[model];
  if (!budget) {
    return { canHandle: true, headroom: Infinity, percentUsed: 0 };
  }

  const headroom = budget.totalBudget - estimatedTokens;
  const percentUsed = (estimatedTokens / budget.totalBudget) * 100;

  return {
    canHandle: estimatedTokens <= budget.totalBudget,
    headroom,
    percentUsed,
  };
}

export function logRouting(result: RouteResult, request: RouteRequest): void {
  console.log(
    `[Model Router] tokens=${request.estimatedTokens} → ${result.model} via ${result.reason} | estCost=$${result.estimatedCost.toFixed(4)}`
  );

  if (result.warnings.length > 0) {
    console.warn(`[Model Router] Warnings: ${result.warnings.join(', ')}`);
  }
}

export function estimateModelCost(model: string, estimatedTokens: number): number {
  const multiplier = model === DEFAULT_MODEL ? DEFAULT_COST_PER_KTOK : DEFAULT_COST_PER_KTOK;
  return Number(((estimatedTokens / 1000) * multiplier).toFixed(6));
}

export function getProviderForModel(model: string): string {
  if (model.startsWith('openrouter/')) return 'openrouter';
  return 'openrouter';
}

export function getRoutingRecommendation(request: RouteRequest): {
  primary: RouteResult;
  alternatives: Array<{ model: string; reason: string; costDelta: number }>;
} {
  const primary = quickRoute(request);
  const alternatives: Array<{ model: string; reason: string; costDelta: number }> = [];

  if (primary.model !== DEFAULT_MODEL) {
    const defaultCost = estimateModelCost(DEFAULT_MODEL, request.estimatedTokens);
    alternatives.push({
      model: DEFAULT_MODEL,
      reason: 'Default OpenRouter auto routing',
      costDelta: defaultCost - primary.estimatedCost,
    });
  }

  return { primary, alternatives };
}
