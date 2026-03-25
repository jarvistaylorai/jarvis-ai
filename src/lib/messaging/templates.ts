/**
 * Template-First Operational Messaging
 * Compact, deterministic templates for system messages
 */

import { MessageClassId } from './messageClasses';

export type TemplateId =
  | 'task_started'
  | 'task_queued'
  | 'rate_limited_queued'
  | 'retry_in_progress'
  | 'downgraded_model_used'
  | 'budget_threshold_hit'
  | 'partial_completion'
  | 'completed_successfully'
  | 'failed_recovery_guidance'
  | 'ack_simple'
  | 'status_progress'
  | 'error_with_code';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'timestamp';
  required: boolean;
  defaultValue?: string;
}

export interface MessageTemplate {
  id: TemplateId;
  messageClass: MessageClassId;
  template: string;
  variables: TemplateVariable[];
  description: string;
  estimatedTokens: number;
}

const VARIABLES = {
  taskId: { name: 'taskId', type: 'string' as const, required: false, defaultValue: 'task' },
  agentId: { name: 'agentId', type: 'string' as const, required: false, defaultValue: 'agent' },
  model: { name: 'model', type: 'string' as const, required: false, defaultValue: 'model' },
  fromModel: { name: 'fromModel', type: 'string' as const, required: true },
  toModel: { name: 'toModel', type: 'string' as const, required: true },
  threshold: { name: 'threshold', type: 'string' as const, required: true },
  currentSpend: { name: 'currentSpend', type: 'string' as const, required: false },
  limit: { name: 'limit', type: 'string' as const, required: false },
  completedCount: { name: 'completedCount', type: 'number' as const, required: false, defaultValue: 'some' },
  totalCount: { name: 'totalCount', type: 'number' as const, required: false, defaultValue: 'all' },
  elapsedMs: { name: 'elapsedMs', type: 'number' as const, required: false },
  errorCode: { name: 'errorCode', type: 'string' as const, required: true },
  recoveryAction: { name: 'recoveryAction', type: 'string' as const, required: false },
  waitSeconds: { name: 'waitSeconds', type: 'number' as const, required: false, defaultValue: '0' },
  progressPercent: { name: 'progressPercent', type: 'number' as const, required: false },
  itemsProcessed: { name: 'itemsProcessed', type: 'number' as const, required: false },
} as const;

const TEMPLATES: Record<TemplateId, MessageTemplate> = {
  task_started: {
    id: 'task_started',
    messageClass: 'status_update',
    template: '▶ {taskId} started',
    variables: [VARIABLES.taskId],
    description: 'Task execution begun',
    estimatedTokens: 15,
  },

  task_queued: {
    id: 'task_queued',
    messageClass: 'status_update',
    template: '⏳ {taskId} queued (position {position})',
    variables: [
      VARIABLES.taskId,
      { name: 'position', type: 'number', required: false, defaultValue: '?' },
    ],
    description: 'Task added to queue',
    estimatedTokens: 18,
  },

  rate_limited_queued: {
    id: 'rate_limited_queued',
    messageClass: 'status_update',
    template: '⏳ {provider} rate limit. Queued {taskId} (retry ~{waitSeconds}s)',
    variables: [
      VARIABLES.taskId,
      { name: 'provider', type: 'string', required: false, defaultValue: 'Provider' },
      VARIABLES.waitSeconds,
    ],
    description: 'Rate limit hit, task queued for retry',
    estimatedTokens: 28,
  },

  retry_in_progress: {
    id: 'retry_in_progress',
    messageClass: 'status_update',
    template: '↻ {taskId} retry {attempt}/{maxAttempts}',
    variables: [
      VARIABLES.taskId,
      { name: 'attempt', type: 'number', required: true },
      { name: 'maxAttempts', type: 'number', required: false, defaultValue: '3' },
    ],
    description: 'Retry attempt in progress',
    estimatedTokens: 18,
  },

  downgraded_model_used: {
    id: 'downgraded_model_used',
    messageClass: 'status_update',
    template: '↓ Budget cap: {fromModel} → {toModel}',
    variables: [VARIABLES.fromModel, VARIABLES.toModel],
    description: 'Model downgraded due to budget constraints',
    estimatedTokens: 20,
  },

  budget_threshold_hit: {
    id: 'budget_threshold_hit',
    messageClass: 'status_update',
    template: '⚠ Spend at {threshold}: {currentSpend}/{limit}',
    variables: [
      VARIABLES.threshold,
      VARIABLES.currentSpend,
      VARIABLES.limit,
    ],
    description: 'Budget threshold reached',
    estimatedTokens: 22,
  },

  partial_completion: {
    id: 'partial_completion',
    messageClass: 'execution_result',
    template: '◐ {taskId}: {completedCount}/{totalCount} complete',
    variables: [
      VARIABLES.taskId,
      VARIABLES.completedCount,
      VARIABLES.totalCount,
    ],
    description: 'Partial task completion',
    estimatedTokens: 20,
  },

  completed_successfully: {
    id: 'completed_successfully',
    messageClass: 'execution_result',
    template: '✓ {taskId} complete ({elapsedMs}s)',
    variables: [VARIABLES.taskId, VARIABLES.elapsedMs],
    description: 'Task completed successfully',
    estimatedTokens: 16,
  },

  failed_recovery_guidance: {
    id: 'failed_recovery_guidance',
    messageClass: 'error_recovery',
    template: '✗ {taskId} failed [{errorCode}]. {recoveryAction}',
    variables: [VARIABLES.taskId, VARIABLES.errorCode, VARIABLES.recoveryAction],
    description: 'Failure with recovery guidance',
    estimatedTokens: 35,
  },

  ack_simple: {
    id: 'ack_simple',
    messageClass: 'ack',
    template: 'OK',
    variables: [],
    description: 'Simple acknowledgment',
    estimatedTokens: 5,
  },

  status_progress: {
    id: 'status_progress',
    messageClass: 'status_update',
    template: '{taskId}: {progressPercent}% ({itemsProcessed} items)',
    variables: [
      VARIABLES.taskId,
      VARIABLES.progressPercent,
      VARIABLES.itemsProcessed,
    ],
    description: 'Progress percentage update',
    estimatedTokens: 20,
  },

  error_with_code: {
    id: 'error_with_code',
    messageClass: 'error_recovery',
    template: 'Error [{errorCode}]: {message}',
    variables: [
      VARIABLES.errorCode,
      { name: 'message', type: 'string', required: true },
    ],
    description: 'Error with code and message',
    estimatedTokens: 25,
  },
};

export function getTemplate(id: TemplateId): MessageTemplate {
  const tpl = TEMPLATES[id];
  if (!tpl) {
    throw new Error(`Unknown template: ${id}`);
  }
  return tpl;
}

export function getAllTemplates(): MessageTemplate[] {
  return Object.values(TEMPLATES);
}

export function getTemplatesForClass(messageClass: MessageClassId): MessageTemplate[] {
  return Object.values(TEMPLATES).filter((t) => t.messageClass === messageClass);
}

/**
 * Renders a template with variable substitution
 */
export function renderTemplate(
  templateId: TemplateId,
  values: Record<string, string | number | undefined>
): { content: string; tokenEstimate: number; template: MessageTemplate } {
  const tpl = getTemplate(templateId);
  let content = tpl.template;

  // Substitute variables
  for (const variable of tpl.variables) {
    const value = values[variable.name];
    const displayValue =
      value !== undefined
        ? String(value)
        : variable.defaultValue ?? `[${variable.name}]`;
    content = content.replace(new RegExp(`\\{${variable.name}\\}`, 'g'), displayValue);
  }

  // Clean up any unsubstituted placeholders
  content = content.replace(/\{[^}]+\}/g, '');

  return {
    content,
    tokenEstimate: tpl.estimatedTokens,
    template: tpl,
  };
}

/**
 * Validates that all required variables are present
 */
export function validateTemplateValues(
  templateId: TemplateId,
  values: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const tpl = getTemplate(templateId);
  const missing: string[] = [];

  for (const variable of tpl.variables) {
    if (variable.required && !(variable.name in values)) {
      missing.push(variable.name);
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Creates a template renderer function for a specific template
 */
export function createRenderer(templateId: TemplateId) {
  return (values: Record<string, string | number | undefined>) =>
    renderTemplate(templateId, values);
}

// Convenience renderers
export const render = {
  taskStarted: createRenderer('task_started'),
  taskQueued: createRenderer('task_queued'),
  rateLimitedQueued: createRenderer('rate_limited_queued'),
  retryInProgress: createRenderer('retry_in_progress'),
  downgradedModel: createRenderer('downgraded_model_used'),
  budgetThreshold: createRenderer('budget_threshold_hit'),
  partialCompletion: createRenderer('partial_completion'),
  completed: createRenderer('completed_successfully'),
  failed: createRenderer('failed_recovery_guidance'),
  ack: createRenderer('ack_simple'),
  progress: createRenderer('status_progress'),
  error: createRenderer('error_with_code'),
};

/**
 * Template registry for lookup by operation type
 */
export const TEMPLATE_REGISTRY: Record<
  string,
  { templateId: TemplateId; condition?: (context: Record<string, unknown>) => boolean }>
> = {
  task_start: { templateId: 'task_started' },
  task_queue: { templateId: 'task_queued' },
  rate_limit: { templateId: 'rate_limited_queued' },
  retry: { templateId: 'retry_in_progress' },
  model_downgrade: { templateId: 'downgraded_model_used' },
  budget_warning: { templateId: 'budget_threshold_hit' },
  partial_complete: { templateId: 'partial_completion' },
  complete: { templateId: 'completed_successfully' },
  failure: { templateId: 'failed_recovery_guidance' },
  ack: { templateId: 'ack_simple' },
  progress: { templateId: 'status_progress' },
  error: { templateId: 'error_with_code' },
};

export function resolveTemplateForOperation(
  operation: string,
  context?: Record<string, unknown>
): TemplateId | null {
  const entry = TEMPLATE_REGISTRY[operation];
  if (!entry) return null;
  if (entry.condition && context && !entry.condition(context)) return null;
  return entry.templateId;
}
