import { TelemetryCategory, TelemetrySeverity } from '@contracts';

export type OpenClawEventType = 
  | "TASK_STARTED" 
  | "TASK_COMPLETED" 
  | "AGENT_STATUS" 
  | "LOG_MESSAGE" 
  | "SUBAGENT_SPAWNED"
  | "AGENT_ERROR";

export interface TelemetryPayload {
  type: OpenClawEventType;
  agent_id: string;
  task_id?: string;
  project_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class TelemetryClient {
  private queue: TelemetryPayload[] = [];
  private isProcessing = false;
  private maxRetries = 5;
  private endpoint = process.env.MISSION_CONTROL_URL || 'http://localhost:3000/api/telemetry';

  constructor() {
    // Flush the queue periodically (fail-safe)
    setInterval(() => {
      this.flushQueue();
    }, 5000);
  }

  /**
   * Tracks an event. Pushes it to the in-memory queue and attempts immediate flush.
   */
  public track(event: TelemetryPayload) {
    this.queue.push({
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    });
    // Fire and forget
    this.flushQueue().catch(() => {});
  }

  private async flushQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    // Snapshot the current queue and clear it to prevent blocking new events
    const batch = [...this.queue];
    this.queue = [];

    const failed: TelemetryPayload[] = [];

    for (const event of batch) {
      try {
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        console.error(`[TelemetryClient] Failed to send event ${event.type}:`, err);
        // Keep track of retry count
        const retries = (event.metadata?.retry_count || 0) + 1;
        if (retries <= this.maxRetries) {
          failed.push({
            ...event,
            metadata: { ...event.metadata, retry_count: retries }
          });
        } else {
          console.error(`[TelemetryClient] Event dropped after ${this.maxRetries} retries:`, event);
        }
      }
    }

    // Re-queue failed events for the next interval
    if (failed.length > 0) {
      this.queue.unshift(...failed);
    }

    this.isProcessing = false;
  }

  // --- Convenience Methods ---

  public taskStarted(agentId: string, taskId: string, projectId?: string, metadata?: any) {
    this.track({
      type: "TASK_STARTED",
      agent_id: agentId,
      task_id: taskId,
      project_id: projectId,
      timestamp: new Date().toISOString(),
      metadata: { message: `Started task: ${taskId}`, ...metadata }
    });
  }

  public taskCompleted(agentId: string, taskId: string, projectId?: string, metadata?: any) {
    this.track({
      type: "TASK_COMPLETED",
      agent_id: agentId,
      task_id: taskId,
      project_id: projectId,
      timestamp: new Date().toISOString(),
      metadata: { message: `Completed task: ${taskId}`, ...metadata }
    });
  }

  public agentStatus(agentId: string, status: string, metadata?: any) {
    this.track({
      type: "AGENT_STATUS",
      agent_id: agentId,
      timestamp: new Date().toISOString(),
      metadata: { message: `Agent status: ${status}`, status, ...metadata }
    });
  }

  public agentError(agentId: string, error: Error | string, taskId?: string, metadata?: any) {
    const errorMsg = error instanceof Error ? error.message : error;
    this.track({
      type: "AGENT_ERROR",
      agent_id: agentId,
      task_id: taskId,
      timestamp: new Date().toISOString(),
      metadata: { message: `Error: ${errorMsg}`, error: errorMsg, ...metadata }
    });
  }

  public logMessage(agentId: string, message: string, taskId?: string, metadata?: any) {
    this.track({
      type: "LOG_MESSAGE",
      agent_id: agentId,
      task_id: taskId,
      timestamp: new Date().toISOString(),
      metadata: { message, ...metadata }
    });
  }

  public subagentSpawned(agentId: string, subagentId: string, taskId?: string, metadata?: any) {
    this.track({
      type: "SUBAGENT_SPAWNED",
      agent_id: agentId,
      task_id: taskId,
      timestamp: new Date().toISOString(),
      metadata: { message: `Spawned subagent ${subagentId}`, subagent_id: subagentId, ...metadata }
    });
  }
}

export const instrumentation = new TelemetryClient();
