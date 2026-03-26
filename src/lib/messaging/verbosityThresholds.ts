import type { MessageClassId } from './messageClasses';

export const VERBOSITY_THRESHOLDS: Partial<Record<MessageClassId, { warn: number; critical: number }>> = {
  status_update: { warn: 150, critical: 220 },
  execution_result: { warn: 700, critical: 900 },
  error_recovery: { warn: 600, critical: 800 },
  ack: { warn: 20, critical: 40 },
};

export function resolveVerbosityThreshold(
  messageClass: MessageClassId,
  fallbackLimit?: number
): { warn: number; critical: number } {
  const preset = VERBOSITY_THRESHOLDS[messageClass];
  if (preset) return preset;
  if (fallbackLimit) {
    return {
      warn: Math.floor(fallbackLimit * 0.85),
      critical: fallbackLimit,
    };
  }
  return { warn: 500, critical: 750 };
}
