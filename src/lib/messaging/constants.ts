/**
 * Messaging Constants
 * Convenience constants for common patterns
 */

import { MessageClassId } from './messageClasses';

export const MessageClass = {
  ACK: 'ack' as MessageClassId,
  STATUS_UPDATE: 'status_update' as MessageClassId,
  CLARIFICATION: 'clarification' as MessageClassId,
  DECISION: 'decision' as MessageClassId,
  SUMMARY: 'summary' as MessageClassId,
  EXECUTION_RESULT: 'execution_result' as MessageClassId,
  ERROR_RECOVERY: 'error_recovery' as MessageClassId,
  INTERNAL_ARTIFACT: 'internal_artifact' as MessageClassId,
} as const;

// Token limits for quick reference
export const TOKEN_LIMITS: Record<MessageClassId, number> = {
  ack: 60,
  status_update: 120,
  clarification: 120,
  decision: 150,
  summary: 250,
  execution_result: 300,
  error_recovery: 180,
  internal_artifact: 4000,
};

// Template priorities for common operations
export const TEMPLATE_PRIORITY: Record<string, number> = {
  ack: 1,
  status_update: 2,
  clarification: 3,
  decision: 4,
  execution_result: 5,
  summary: 6,
  error_recovery: 7,
  internal_artifact: 8,
};
