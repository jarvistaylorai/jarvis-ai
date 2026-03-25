/**
 * Messaging Discipline Layer
 * Central exports for message classes, policy, templates, and digest
 */

// Message Classes
export {
  getMessageClass,
  isValidMessageClass,
  getMaxTokensForClass,
  shouldUseTemplate,
  isInternalOnly,
  getAudience,
  MESSAGE_CLASS_IDS,
} from './messageClasses';
export type {
  MessageClassId,
  MessageClassDefinition,
  Audience,
  VerbosityPolicy,
  RenderingMode,
} from './messageClasses';

// Policy Layer
export {
  validateMessagePayload,
  resolvePolicy,
  enforceOutputCap,
  createDeliveryArtifact,
  stripVerbosity,
  guardInternalContent,
  prepareMessage,
  getOutputTokenLimit,
} from './policy';
export type {
  MessagePolicyResult,
  RenderedMessage,
  DeliveryArtifact,
  InternalArtifact,
  MessagePayload,
  PolicyValidation,
} from './policy';

// Templates
export {
  getTemplate,
  getAllTemplates,
  getTemplatesForClass,
  renderTemplate,
  validateTemplateValues,
  createRenderer,
  render,
  resolveTemplateForOperation,
  TEMPLATE_REGISTRY,
} from './templates';
export type { TemplateId, TemplateVariable, MessageTemplate } from './templates';

// Digest
export {
  getDigestCollector,
  resetDigestCollector,
  emitDigest,
  flushDigests,
  withDigest,
} from './digest';
export type {
  DigestEntry,
  DigestBucket,
  DigestResult,
  DigestStrategy,
} from './digest';

// Telemetry
export { messageTelemetry } from './telemetry';
export type { MessageTelemetryEvent } from './telemetry';

// Middleware
export {
  withMessageDiscipline,
  createDisciplinedHandler,
} from './middleware';
export type { MessageContext } from './middleware';

// Convenience exports for common patterns
export { MessageClass, TOKEN_LIMITS, TEMPLATE_PRIORITY } from './constants';
