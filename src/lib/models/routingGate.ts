import type { TaskType } from '@/lib/models/quickRouter';

export type RoutingTier = 'none' | 'cheap' | 'premium';
export type GateDecision = 'no_model' | 'cheap' | 'premium';

export interface RoutingGateInput {
  userMessage: string;
  taskType?: TaskType;
  toolNames?: string[];
  estimatedTokens?: number;
  forcePremium?: boolean;
}

export interface RoutingGateResult {
  decision: GateDecision;
  requiresModel: boolean;
  requiresPremium: boolean;
  recommendedTier: RoutingTier;
  complexityScore: number; // 0-1
  confidenceScore: number;  // 0-1
  indicators: string[];
  rationale: string;
  escalateReasons: string[];
  estimatedTokens: number;
}

const PREMIUM_KEYWORDS = [
  'architecture',
  'strateg',
  'multi-step',
  'deploy',
  'security',
  'compliance',
  'investor',
  'contract',
  'legal',
  'negotiat',
  'design system',
  'migration',
];

const CODE_INDICATORS = ['```', 'function', 'class ', 'const ', 'import ', 'export ', 'async ', ';', '{', '}'];
const NO_MODEL_PATTERNS = [/^ok[a-y]?$/i, /^thanks?$/i, /^thank you$/i, /^👍$/, /^ack$/i, /^noted$/i];
const CHEAP_MODEL_DEFAULT: RoutingTier = 'cheap';

function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function detectNoModel(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length > 60) return false;
  return NO_MODEL_PATTERNS.some((regex) => regex.test(trimmed.toLowerCase()));
}

function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function containsCode(text: string): boolean {
  return CODE_INDICATORS.some((indicator) => text.includes(indicator));
}

export function runRoutingGate(input: RoutingGateInput): RoutingGateResult {
  const estimatedTokens = input.estimatedTokens ?? approxTokens(input.userMessage);
  const indicators: string[] = [];
  const escalateReasons: string[] = [];

  if (detectNoModel(input.userMessage)) {
    indicators.push('no-model-heuristic');
    return {
      decision: 'no_model',
      requiresModel: false,
      requiresPremium: false,
      recommendedTier: 'none',
      complexityScore: 0,
      confidenceScore: 0.95,
      indicators,
      rationale: 'Trivial acknowledgement / template-only request detected.',
      escalateReasons,
      estimatedTokens,
    };
  }

  let complexityScore = Math.min(1, estimatedTokens / 2000);
  if (containsKeyword(input.userMessage, PREMIUM_KEYWORDS)) {
    complexityScore = Math.min(1, complexityScore + 0.25);
    indicators.push('premium-keyword');
    escalateReasons.push('keyword');
  }
  if (containsCode(input.userMessage)) {
    complexityScore = Math.min(1, complexityScore + 0.2);
    indicators.push('code');
    escalateReasons.push('code');
  }
  if (input.taskType && ['coding', 'architecture'].includes(input.taskType)) {
    complexityScore = Math.min(1, complexityScore + 0.2);
    indicators.push(`task-${input.taskType}`);
    escalateReasons.push('taskType');
  }
  if (input.toolNames?.some((name) => name.includes('run_command') || name.includes('deploy'))) {
    complexityScore = Math.min(1, complexityScore + 0.15);
    indicators.push('tool-highrisk');
    escalateReasons.push('tool');
  }

  const confidenceScore = Math.min(1, 0.5 + Math.abs(0.5 - complexityScore));
  let decision: GateDecision = 'cheap';
  let recommendedTier: RoutingTier = CHEAP_MODEL_DEFAULT;
  let requiresPremium = false;
  const requiresModel = true;

  if (input.forcePremium) {
    decision = 'premium';
    recommendedTier = 'premium';
    requiresPremium = true;
    escalateReasons.push('forced');
  } else if (complexityScore >= 0.55) {
    decision = 'premium';
    recommendedTier = 'premium';
    requiresPremium = true;
  } else if (complexityScore <= 0.25 && indicators.length === 0) {
    decision = 'cheap';
    recommendedTier = 'cheap';
  }

  return {
    decision,
    requiresModel,
    requiresPremium,
    recommendedTier,
    complexityScore,
    confidenceScore,
    indicators,
    rationale:
      decision === 'premium'
        ? 'High complexity or risk indicators triggered premium escalation.'
        : 'Low complexity detected; cheap tier is sufficient.',
    escalateReasons,
    estimatedTokens,
  };
}
