import type { PaginatedResult, TelemetryEvent, TelemetryCategory, TelemetrySeverity } from '@contracts';
import { prisma } from './database';

export type ListTelemetryParams = {
  workspaceId: string;
  limit?: number;
  cursor?: string;
};

export type TelemetrySummary = {
  events: TelemetryEvent[];
  stats: {
    total: number;
    errors: number;
    heartbeats: number;
  };
};

export type CreateTelemetryInput = {
  workspaceId: string;
  agentId?: string;
  taskId?: string;
  projectId?: string;
  category: TelemetryCategory;
  severity: TelemetrySeverity;
  eventType: string;
  message: string;
  payload?: Record<string, any>;
  latencyMs?: number;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
};

function mapTelemetry(record: any): TelemetryEvent {
  return {
    id: record.id,
    workspace_id: record.workspace,
    agent_id: record.agent_id || undefined,
    task_id: record.task_id || undefined,
    project_id: record.project_id || undefined,
    category: (record.category || TelemetryCategory.EVENT) as TelemetryCategory,
    severity: (record.severity || TelemetrySeverity.INFO) as TelemetrySeverity,
    event_type: record.event_type || record.status || 'event',
    message: record.message,
    payload: record.payload ? JSON.parse(record.payload) : undefined,
    latency_ms: record.latency_ms || undefined,
    tokens_input: record.tokens_input || undefined,
    tokens_output: record.tokens_output || undefined,
    cost_usd: record.cost_usd || undefined,
    correlation_id: record.correlation_id || undefined,
    created_at: record.created_at?.toISOString?.() || record.timestamp || new Date().toISOString(),
    updated_at: record.updated_at?.toISOString?.() || new Date().toISOString()
  };
}

export async function listTelemetryEvents({ workspaceId, limit = 50, cursor }: ListTelemetryParams): Promise<PaginatedResult<TelemetryEvent>> {
  const events = await prisma.activity.findMany({
    where: { workspace: workspaceId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });
  const nextCursor = events.length === limit ? events[events.length - 1].id : undefined;
  return {
    data: events.map(mapTelemetry),
    next_cursor: nextCursor
  };
}

export async function getTelemetrySummary(workspaceId: string): Promise<TelemetrySummary> {
  const recent = await prisma.activity.findMany({
    where: { workspace: workspaceId },
    orderBy: { timestamp: 'desc' },
    take: 20
  });
  const events = recent.map(mapTelemetry);
  const stats = events.reduce(
    (acc, event) => {
      acc.total += 1;
      if (event.severity === TelemetrySeverity.CRITICAL) acc.errors += 1;
      if (event.category === TelemetryCategory.HEARTBEAT) acc.heartbeats += 1;
      return acc;
    },
    { total: 0, errors: 0, heartbeats: 0 }
  );
  return { events, stats };
}

export async function recordTelemetry(input: CreateTelemetryInput): Promise<TelemetryEvent> {
  const record = await prisma.activity.create({
    data: {
      workspace: input.workspaceId,
      agent_id: input.agentId || null,
      task_id: input.taskId || null,
      message: input.message,
      status: input.eventType,
      timestamp: new Date().toISOString(),
      category: input.category,
      severity: input.severity,
      payload: input.payload ? JSON.stringify(input.payload) : null,
      latency_ms: input.latencyMs || null,
      tokens_input: input.tokensInput || null,
      tokens_output: input.tokensOutput || null,
      cost_usd: input.costUsd || null
    } as any
  });
  return mapTelemetry(record);
}
