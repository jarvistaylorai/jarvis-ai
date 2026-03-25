/**
 * Message Class Framework
 * Canonical message types with strict output discipline
 */

export type MessageClassId =
  | 'ack'
  | 'status_update'
  | 'clarification'
  | 'decision'
  | 'summary'
  | 'execution_result'
  | 'error_recovery'
  | 'internal_artifact';

export type Audience = 'internal' | 'user' | 'agent-to-agent';

export type VerbosityPolicy = 'minimal' | 'compact' | 'standard' | 'verbose';

export type RenderingMode = 'template_only' | 'template_with_fill' | 'freeform';

export interface MessageClassDefinition {
  id: MessageClassId;
  description: string;
  audience: Audience;
  maxOutputTokens: number;
  minOutputTokens: number;
  verbosityPolicy: VerbosityPolicy;
  templateFirst: boolean;
  allowFreeform: boolean;
  preferredRendering: RenderingMode;
  requiresCompression: boolean;
  internalOnly: boolean;
}

const DEFAULT_MESSAGE_CLASSES: Record<MessageClassId, MessageClassDefinition> = {
  ack: {
    id: 'ack',
    description: 'Lightweight acknowledgment. No reasoning, no explanation.',
    audience: 'user',
    maxOutputTokens: 60,
    minOutputTokens: 10,
    verbosityPolicy: 'minimal',
    templateFirst: true,
    allowFreeform: false,
    preferredRendering: 'template_only',
    requiresCompression: false,
    internalOnly: false,
  },

  status_update: {
    id: 'status_update',
    description: 'Brief progress indication. State change only, no exposition.',
    audience: 'user',
    maxOutputTokens: 120,
    minOutputTokens: 20,
    verbosityPolicy: 'compact',
    templateFirst: true,
    allowFreeform: false,
    preferredRendering: 'template_with_fill',
    requiresCompression: false,
    internalOnly: false,
  },

  clarification: {
    id: 'clarification',
    description: 'Request for missing information. One question, minimal context.',
    audience: 'user',
    maxOutputTokens: 120,
    minOutputTokens: 30,
    verbosityPolicy: 'compact',
    templateFirst: true,
    allowFreeform: true,
    preferredRendering: 'template_with_fill',
    requiresCompression: true,
    internalOnly: false,
  },

  decision: {
    id: 'decision',
    description: 'Decision announcement with brief rationale.',
    audience: 'user',
    maxOutputTokens: 150,
    minOutputTokens: 40,
    verbosityPolicy: 'compact',
    templateFirst: true,
    allowFreeform: true,
    preferredRendering: 'template_with_fill',
    requiresCompression: true,
    internalOnly: false,
  },

  summary: {
    id: 'summary',
    description: 'Condensed outcome of multi-step work. Key points only.',
    audience: 'user',
    maxOutputTokens: 250,
    minOutputTokens: 60,
    verbosityPolicy: 'standard',
    templateFirst: true,
    allowFreeform: true,
    preferredRendering: 'template_with_fill',
    requiresCompression: true,
    internalOnly: false,
  },

  execution_result: {
    id: 'execution_result',
    description: 'Outcome of task execution. Structured, scannable.',
    audience: 'user',
    maxOutputTokens: 300,
    minOutputTokens: 80,
    verbosityPolicy: 'standard',
    templateFirst: true,
    allowFreeform: true,
    preferredRendering: 'template_with_fill',
    requiresCompression: true,
    internalOnly: false,
  },

  error_recovery: {
    id: 'error_recovery',
    description: 'Failure notification with recovery path. Actionable.',
    audience: 'user',
    maxOutputTokens: 180,
    minOutputTokens: 50,
    verbosityPolicy: 'compact',
    templateFirst: true,
    allowFreeform: true,
    preferredRendering: 'template_with_fill',
    requiresCompression: true,
    internalOnly: false,
  },

  internal_artifact: {
    id: 'internal_artifact',
    description: 'Full reasoning, working notes, structured data. Not for display.',
    audience: 'internal',
    maxOutputTokens: 4000,
    minOutputTokens: 100,
    verbosityPolicy: 'verbose',
    templateFirst: false,
    allowFreeform: true,
    preferredRendering: 'freeform',
    requiresCompression: false,
    internalOnly: true,
  },
};

export function getMessageClass(id: MessageClassId): MessageClassDefinition {
  const cls = DEFAULT_MESSAGE_CLASSES[id];
  if (!cls) {
    throw new Error(`Unknown message class: ${id}`);
  }
  return cls;
}

export function isValidMessageClass(id: string): id is MessageClassId {
  return id in DEFAULT_MESSAGE_CLASSES;
}

export function getMaxTokensForClass(id: MessageClassId): number {
  return getMessageClass(id).maxOutputTokens;
}

export function shouldUseTemplate(id: MessageClassId): boolean {
  const cls = getMessageClass(id);
  return cls.templateFirst || cls.preferredRendering === 'template_only';
}

export function isInternalOnly(id: MessageClassId): boolean {
  return getMessageClass(id).internalOnly;
}

export function getAudience(id: MessageClassId): Audience {
  return getMessageClass(id).audience;
}

export const MESSAGE_CLASS_IDS: MessageClassId[] = Object.keys(
  DEFAULT_MESSAGE_CLASSES
) as MessageClassId[];
