/**
 * Messaging Telemetry Integration
 * Records message discipline metrics for observability
 */

import { MessageClassId } from './messageClasses';
import { DeliveryArtifact, InternalArtifact, MessagePayload } from './policy';

export interface MessageTelemetryEvent {
  timestamp: number;
  messageClass: MessageClassId;
  renderingMode: string;
  templateUsed?: string;
  tokenEstimate: number;
  wasTemplateRendered: boolean;
  wasCompressed: boolean;
  compressionRatio?: number;
  guardViolations?: string[];
}

class MessageTelemetryCollector {
  private events: MessageTelemetryEvent[] = [];
  private maxEvents = 1000;

  record(event: MessageTelemetryEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  recordDelivery(
    messageClass: MessageClassId,
    artifact: DeliveryArtifact,
    templateId?: string
  ): void {
    this.record({
      timestamp: Date.now(),
      messageClass,
      renderingMode: templateId ? 'template' : 'freeform',
      templateUsed: templateId,
      tokenEstimate: artifact.tokenEstimate,
      wasTemplateRendered: !!templateId,
      wasCompressed: artifact.compressionApplied,
      compressionRatio: artifact.compressedFrom
        ? artifact.content.length / artifact.compressedFrom.length
        : undefined,
    });
  }

  recordFromPayload(
    payload: MessagePayload,
    artifact: DeliveryArtifact,
    templateId?: string,
    guardViolations?: string[]
  ): void {
    this.record({
      timestamp: Date.now(),
      messageClass: payload.messageClass,
      renderingMode: templateId ? 'template' : 'freeform',
      templateUsed: templateId,
      tokenEstimate: artifact.tokenEstimate,
      wasTemplateRendered: !!templateId,
      wasCompressed: artifact.compressionApplied,
      guardViolations,
    });
  }

  getStats(): {
    totalMessages: number;
    byClass: Record<MessageClassId, number>;
    templateRate: number;
    avgTokenEstimate: number;
    compressionRate: number;
  } {
    const byClass = {} as Record<MessageClassId, number>;
    let templateCount = 0;
    let totalTokens = 0;
    let compressedCount = 0;

    for (const event of this.events) {
      byClass[event.messageClass] = (byClass[event.messageClass] || 0) + 1;
      if (event.wasTemplateRendered) templateCount++;
      totalTokens += event.tokenEstimate;
      if (event.wasCompressed) compressedCount++;
    }

    return {
      totalMessages: this.events.length,
      byClass,
      templateRate: this.events.length > 0 ? templateCount / this.events.length : 0,
      avgTokenEstimate: this.events.length > 0 ? totalTokens / this.events.length : 0,
      compressionRate: this.events.length > 0 ? compressedCount / this.events.length : 0,
    };
  }

  flush(): MessageTelemetryEvent[] {
    const flushed = [...this.events];
    this.events = [];
    return flushed;
  }
}

export const messageTelemetry = new MessageTelemetryCollector();
