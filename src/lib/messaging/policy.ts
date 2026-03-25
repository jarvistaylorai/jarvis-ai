/**
 * Message Policy Layer
 * Central validation and enforcement for message discipline
 */

import {
  MessageClassId,
  MessageClassDefinition,
  RenderingMode,
  Audience,
  getMessageClass,
  isValidMessageClass,
} from './messageClasses';

export interface MessagePolicyResult {
  valid: boolean;
  messageClass: MessageClassDefinition;
  maxOutputTokens: number;
  renderingMode: RenderingMode;
  shouldCompress: boolean;
  errors: string[];
  warnings: string[];
}

export interface RenderedMessage {
  content: string;
  tokenEstimate: number;
  messageClass: MessageClassId;
  audience: Audience;
  isTemplateRendered: boolean;
  originalContent?: string;
  compressionRatio?: number;
}

export interface DeliveryArtifact {
  content: string;
  tokenEstimate: number;
  messageClass: MessageClassId;
  compressedFrom?: string;
  compressionApplied: boolean;
}

export interface InternalArtifact {
  content: string;
  fullReasoning?: string;
  structuredData?: Record<string, unknown>;
  timestamp: number;
}

export interface MessagePayload {
  messageClass: MessageClassId;
  content: string;
  context?: Record<string, unknown>;
  requireCompression?: boolean;
  overrideTokens?: number;
}

export interface PolicyValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedPayload: MessagePayload;
}

/**
 * Validates message payload against policy
 */
export function validateMessagePayload(payload: MessagePayload): PolicyValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isValidMessageClass(payload.messageClass)) {
    errors.push(`Invalid message class: ${payload.messageClass}`);
    return { isValid: false, errors, warnings, normalizedPayload: payload };
  }

  const cls = getMessageClass(payload.messageClass);

  // Check content constraints
  if (!payload.content || payload.content.trim().length === 0) {
    errors.push('Message content cannot be empty');
  }

  // Warn if content seems too verbose for class
  const roughTokenEstimate = Math.ceil(payload.content.length / 4);
  if (roughTokenEstimate > cls.maxOutputTokens * 1.2) {
    warnings.push(
      `Content may exceed max tokens (${roughTokenEstimate} estimated vs ${cls.maxOutputTokens} limit)`
    );
  }

  // Validate override tokens
  let normalizedPayload = payload;
  if (payload.overrideTokens !== undefined) {
    if (payload.overrideTokens > cls.maxOutputTokens) {
      warnings.push(`Override tokens (${payload.overrideTokens}) exceeds class maximum (${cls.maxOutputTokens})`);
      normalizedPayload = { ...payload, overrideTokens: cls.maxOutputTokens };
    }
    if (payload.overrideTokens < cls.minOutputTokens) {
      warnings.push(`Override tokens (${payload.overrideTokens}) below class minimum (${cls.minOutputTokens})`);
      normalizedPayload = { ...payload, overrideTokens: cls.minOutputTokens };
    }
  }

  // Check template compliance
  if (cls.templateFirst && !payload.context) {
    warnings.push(`Message class ${cls.id} prefers template rendering but no context provided`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedPayload,
  };
}

/**
 * Resolves policy for a message class
 */
export function resolvePolicy(messageClassId: MessageClassId): MessagePolicyResult {
  const cls = getMessageClass(messageClassId);
  const errors: string[] = [];
  const warnings: string[] = [];

  return {
    valid: errors.length === 0,
    messageClass: cls,
    maxOutputTokens: cls.maxOutputTokens,
    renderingMode: cls.preferredRendering,
    shouldCompress: cls.requiresCompression,
    errors,
    warnings,
  };
}

/**
 * Enforces hard output caps based on message class
 */
export function enforceOutputCap(
  content: string,
  messageClassId: MessageClassId,
  overrideCap?: number
): { content: string; wasTruncated: boolean; originalLength: number; finalLength: number } {
  const cls = getMessageClass(messageClassId);
  const maxTokens = overrideCap ?? cls.maxOutputTokens;
  const maxChars = maxTokens * 4; // Rough approximation

  if (content.length <= maxChars) {
    return {
      content,
      wasTruncated: false,
      originalLength: content.length,
      finalLength: content.length,
    };
  }

  // Truncate with minimal ellipsis
  const truncated = content.slice(0, maxChars - 10) + '… [trimmed]';
  return {
    content: truncated,
    wasTruncated: true,
    originalLength: content.length,
    finalLength: truncated.length,
  };
}

/**
 * Creates a delivery artifact from internal artifact
 */
export function createDeliveryArtifact(
  internal: InternalArtifact,
  messageClassId: MessageClassId
): DeliveryArtifact {
  const cls = getMessageClass(messageClassId);

  if (cls.internalOnly) {
    throw new Error(`Cannot create delivery artifact from internal-only class: ${messageClassId}`);
  }

  // Extract from structured data if available
  let content = internal.content;
  let compressedFrom: string | undefined;
  let compressionApplied = false;

  if (internal.structuredData?.summary) {
    content = String(internal.structuredData.summary);
    compressedFrom = internal.content;
    compressionApplied = true;
  }

  // Apply hard cap
  const capped = enforceOutputCap(content, messageClassId);

  return {
    content: capped.content,
    tokenEstimate: Math.ceil(capped.content.length / 4),
    messageClass: messageClassId,
    compressedFrom,
    compressionApplied: compressionApplied || capped.wasTruncated,
  };
}

/**
 * Strips unnecessary verbosity based on policy
 */
export function stripVerbosity(content: string, verbosityPolicy: string): string {
  switch (verbosityPolicy) {
    case 'minimal':
      // Remove filler words, pleasantries, explanations
      return content
        .replace(/\b(I will|I'll|I am|I'm|please|thank you|sure|of course)\b/gi, '')
        .replace(/\.{2,}/g, '.')
        .replace(/\s+/g, ' ')
        .trim();

    case 'compact':
      // Remove redundancies, keep key info
      return content
        .replace(/\b(just|simply|basically|actually|essentially)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    case 'standard':
      // Light cleanup
      return content
        .replace(/\s+/g, ' ')
        .trim();

    case 'verbose':
    default:
      return content.trim();
  }
}

/**
 * Guardrail: ensures internal content never leaks to delivery
 */
export function guardInternalContent(
  content: string,
  intendedClass: MessageClassId
): { safe: boolean; sanitized: string; violations: string[] } {
  const violations: string[] = [];
  let sanitized = content;

  // Check for internal markers
  const internalMarkers = [
    /\[internal\]/gi,
    /\[reasoning\]/gi,
    /\[draft\]/gi,
    /\[working notes\]/gi,
    /\[do not send\]/gi,
  ];

  for (const marker of internalMarkers) {
    if (marker.test(content)) {
      violations.push(`Content contains internal marker: ${marker.source}`);
      sanitized = sanitized.replace(marker, '');
    }
  }

  // Check if content exceeds typical user-facing length by 5x
  const cls = getMessageClass(intendedClass);
  if (!cls.internalOnly && content.length > cls.maxOutputTokens * 4 * 5) {
    violations.push(`Content suspiciously long for ${intendedClass} class`);
  }

  return { safe: violations.length === 0, sanitized: sanitized.trim(), violations };
}

/**
 * Policy-enforced message preparation pipeline
 */
export function prepareMessage(payload: MessagePayload): {
  validation: PolicyValidation;
  policy: MessagePolicyResult;
  artifact?: DeliveryArtifact;
  internal?: InternalArtifact;
} {
  const validation = validateMessagePayload(payload);

  if (!validation.isValid) {
    return { validation, policy: resolvePolicy(payload.messageClass) };
  }

  const policy = resolvePolicy(payload.messageClass);

  // Guard against internal content leakage
  const guard = guardInternalContent(payload.content, payload.messageClass);
  let content = guard.sanitized;

  if (!guard.safe) {
    console.warn('[MessagePolicy] Internal content guard triggered:', guard.violations);
  }

  // Strip verbosity
  content = stripVerbosity(content, policy.messageClass.verbosityPolicy);

  // Create internal artifact if needed
  let internal: InternalArtifact | undefined;
  if (payload.context || guard.violations.length > 0) {
    internal = {
      content: payload.content,
      fullReasoning: guard.violations.length > 0 ? `Guard violations: ${guard.violations.join(', ')}` : undefined,
      structuredData: payload.context,
      timestamp: Date.now(),
    };
  }

  // Create delivery artifact
  const enforced = enforceOutputCap(content, payload.messageClass, payload.overrideTokens);
  const artifact: DeliveryArtifact = {
    content: enforced.content,
    tokenEstimate: Math.ceil(enforced.content.length / 4),
    messageClass: payload.messageClass,
    compressionApplied: enforced.wasTruncated,
  };

  return { validation, policy, artifact, internal };
}

/**
 * Gets output token limit for LLM calls based on message class
 */
export function getOutputTokenLimit(
  messageClassId: MessageClassId,
  fallbackTokens?: number
): number {
  if (!isValidMessageClass(messageClassId)) {
    return fallbackTokens ?? 150;
  }
  return getMessageClass(messageClassId).maxOutputTokens;
}
