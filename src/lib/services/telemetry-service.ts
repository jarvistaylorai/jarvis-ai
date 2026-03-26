import { PaginatedResult, TelemetryEvent, TelemetryCategory, TelemetrySeverity } from '@contracts';
import { prisma } from './database';
import { getWorkspaceId } from '../workspace-utils';
import type { Provider } from '../llm/types';
import type { PriorityLevel } from '../llm/providerLimits';
import type { ProviderPressure, RateLimiterMetricsSnapshot } from '../llm/rateLimiter';
import type { DuplicateStatus } from '../llm/promptCache';
import type { MessageClassId } from '../messaging/messageClasses';
import { resolveVerbosityThreshold } from '../messaging/verbosityThresholds';
import { TelemetryEvent } from '@contracts';

const DIGEST_TOKEN_RATE_USD = Number(process.env.DIGEST_TOKEN_RATE_USD ?? 0.000002);
const VERBOSITY_ALERT_COOLDOWN_MS = Number(
  process.env.VERBOSITY_ALERT_COOLDOWN_MS ?? 60 * 60 * 1000
);

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
  payload?: Record<string, unknown>;
  latencyMs?: number;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
};

function mapTelemetry(record: Record<string, unknown>): TelemetryEvent {
  return {
    id: record.id,
    workspace_id: record.workspace_id,
    agent_id: record.agent_id || undefined,
    task_id: record.task_id || undefined,
    project_id: record.project_id || undefined,
    category: (record.category || TelemetryCategory.EVENT) as TelemetryCategory,
    severity: (record.severity || TelemetrySeverity.INFO) as TelemetrySeverity,
    event_type: record.event_type || record.event_type || 'event',
    message: record.message,
    payload: record.payload ? (typeof record.payload === 'string' ? JSON.parse(record.payload) : record.payload) : undefined,
    latency_ms: record.latency_ms || undefined,
    tokens_input: record.tokens_input || undefined,
    tokens_output: record.tokens_output || undefined,
    cost_usd: record.cost_usd || undefined,
    correlation_id: record.correlation_id || undefined,
    created_at: record.created_at?.toISOString?.() || record.created_at || new Date().toISOString(),
    updated_at: record.updated_at?.toISOString?.() || new Date().toISOString()
  };
}

export async function listTelemetryEvents({ workspaceId, limit = 50, cursor }: ListTelemetryParams): Promise<PaginatedResult<TelemetryEvent>> {
  const mappedWorkspaceId = getWorkspaceId(workspaceId);
  const events = await prisma.telemetry_events.findMany({
    where: { workspace_id: mappedWorkspaceId },
    orderBy: { created_at: 'desc' },
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
  const mappedWorkspaceId = getWorkspaceId(workspaceId);
  const recent = await prisma.telemetry_events.findMany({
    where: { workspace_id: mappedWorkspaceId },
    orderBy: { created_at: 'desc' },
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
  const mappedWorkspaceId = getWorkspaceId(input.workspaceId);
  const record = await prisma.telemetry_events.create({
    data: {
      workspace_id: mappedWorkspaceId,
      agent_id: input.agentId || null,
      task_id: input.taskId || null,
      message: input.message,
      event_type: input.eventType,
      category: input.category,
      severity: input.severity,
      payload: input.payload ? JSON.stringify(input.payload) : null,
      latency_ms: input.latencyMs || null,
      tokens_input: input.tokensInput || null,
      tokens_output: input.tokensOutput || null,
      cost_usd: input.costUsd || null
    } as unknown
  });
  return mapTelemetry(record);
}

export async function recordRoutingEvent(params: {
  workspaceId: string;
  agentId?: string;
  decision: string;
  tier: string;
  estimatedSavingsUsd?: number;
  rationale: string;
  escalateReasons?: string[];
  complexity: number;
  confidence: number;
}): Promise<void> {
  await recordTelemetry({
    workspaceId: params.workspaceId,
    agentId: params.agentId,
    category: TelemetryCategory.METRIC,
    severity: TelemetrySeverity.INFO,
    eventType: 'routing.gate',
    message: `Routing gate decided ${params.decision}`,
    payload: {
      decision: params.decision,
      tier: params.tier,
      estimatedSavingsUsd: params.estimatedSavingsUsd,
      rationale: params.rationale,
      escalateReasons: params.escalateReasons,
      complexity: params.complexity,
      confidence: params.confidence,
    },
  });
}

export async function recordRateLimiterEvent(params: {
  workspaceId: string;
  agentId?: string;
  taskId?: string;
  provider: Provider;
  model: string;
  priority: PriorityLevel;
  pressure: ProviderPressure;
  metrics: RateLimiterMetricsSnapshot;
  latencyMs: number;
}): Promise<void> {
  const severity =
    params.pressure.mode === 'emergency'
      ? TelemetrySeverity.CRITICAL
      : params.pressure.mode === 'protection'
      ? TelemetrySeverity.WARNING
      : TelemetrySeverity.INFO;

  await recordTelemetry({
    workspaceId: params.workspaceId,
    agentId: params.agentId,
    taskId: params.taskId,
    category: TelemetryCategory.METRIC,
    severity,
    eventType: 'llm.rateLimiter',
    message: `Rate limiter ${params.pressure.mode} (${params.pressure.modeSource}) for ${params.provider}`,
    payload: {
      provider: params.provider,
      model: params.model,
      priority: params.priority,
      pressure: params.pressure,
      metrics: params.metrics,
      latencyMs: params.latencyMs,
    },
    latencyMs: params.latencyMs,
  });
}

export async function recordAvoidableSpendEvent(params: {
  workspaceId: string;
  agentId?: string;
  taskId?: string;
  projectId?: string;
  reason: 'replay' | 'downgrade' | 'verbosity' | 'truncation' | 'pressure' | 'digest' | 'template';
  tokensAvoided?: number;
  usdAvoided?: number;
  promptHash?: string;
  duplicateStatus?: DuplicateStatus;
  downgradedFrom?: string;
  downgradedTo?: string;
  priority?: string | PriorityLevel;
  messageClass?: string;
  model?: string;
  provider?: string;
  pressureMode?: string;
  outputTokens?: number;
  outputLimit?: number;
  truncatedTokens?: number;
}): Promise<void> {
  const severity = ['downgrade', 'digest', 'template'].includes(params.reason)
    ? TelemetrySeverity.INFO
    : TelemetrySeverity.WARNING;
  await recordTelemetry({
    workspaceId: params.workspaceId,
    agentId: params.agentId,
    taskId: params.taskId,
    projectId: params.projectId,
    category: TelemetryCategory.METRIC,
    severity,
    eventType: 'spend.avoidable',
    message: `Avoidable spend (${params.reason})`,
    payload: {
      reason: params.reason,
      tokensAvoided: params.tokensAvoided,
      usdAvoided: params.usdAvoided,
      promptHash: params.promptHash,
      duplicateStatus: params.duplicateStatus,
      downgradedFrom: params.downgradedFrom,
      downgradedTo: params.downgradedTo,
      priority: params.priority,
      messageClass: params.messageClass,
      model: params.model,
      provider: params.provider,
      pressureMode: params.pressureMode,
      outputTokens: params.outputTokens,
      outputLimit: params.outputLimit,
      truncatedTokens: params.truncatedTokens,
    },
    tokensInput: params.tokensAvoided,
    tokensOutput: params.outputTokens,
    costUsd: params.usdAvoided,
  });
}

export async function recordDigestSavings(params: {
  workspaceId: string;
  agentId: string;
  taskId?: string;
  projectId?: string;
  messageClass: MessageClassId;
  tokensAvoided: number;
  entryCount: number;
  context?: Record<string, unknown>;
}): Promise<void> {
  if (!params.agentId || params.tokensAvoided <= 0) return;
  const usdAvoided = params.tokensAvoided * DIGEST_TOKEN_RATE_USD;

  await prisma.spendLog.create({
    data: {
      workspace: params.workspaceId,
      agent_id: params.agentId,
      model: 'digest',
      provider: 'internal',
      tokens_input: 0,
      tokens_output: 0,
      tokens_total: 0,
      cost: 0,
      task_id: params.taskId || null,
      project_id: params.projectId || null,
      message_class: params.messageClass,
      priority: 'P3',
      duplicate_status: 'fresh',
      downgraded_from: null,
      avoided_tokens: params.tokensAvoided,
      avoided_usd: usdAvoided,
      avoided_reason: 'digest',
      tokens_reused: 0,
      tokens_truncated: 0,
      verbosity_flag: false,
      pressure_mode: 'internal',
    },
  });

  await recordAvoidableSpendEvent({
    workspaceId: params.workspaceId,
    agentId: params.agentId,
    taskId: params.taskId,
    projectId: params.projectId,
    reason: 'digest',
    tokensAvoided: params.tokensAvoided,
    usdAvoided,
    messageClass: params.messageClass,
  });
}

export async function recordVerbositySample(params: {
  workspaceId: string;
  messageClass?: MessageClassId;
  tokens?: number;
  outputLimit?: number;
  agentId?: string;
  taskId?: string;
}): Promise<void> {
  if (!params.messageClass || typeof params.tokens !== 'number') return;
  const dayKey = new Date();
  dayKey.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.messageClassStat.findUnique({
    where: {
      workspace_message_class_day: {
        workspace: params.workspaceId,
        message_class: params.messageClass,
        day: dayKey,
      },
    },
  });

  let rollingAvg = params.tokens;
  if (!existing) {
    await prisma.messageClassStat.create({
      data: {
        workspace: params.workspaceId,
        message_class: params.messageClass,
        day: dayKey,
        total_tokens: params.tokens,
        sample_count: 1,
        rolling_avg: params.tokens,
        last_sample: new Date(),
      },
    });
  } else {
    rollingAvg = existing.rolling_avg === 0
      ? params.tokens
      : existing.rolling_avg * 0.8 + params.tokens * 0.2;

    await prisma.messageClassStat.update({
      where: { id: existing.id },
      data: {
        total_tokens: existing.total_tokens + params.tokens,
        sample_count: existing.sample_count + 1,
        rolling_avg,
        last_sample: new Date(),
      },
    });
  }

  const thresholds = resolveVerbosityThreshold(params.messageClass, params.outputLimit);
  let alertSeverity: 'warning' | 'critical' | null = null;
  if (rollingAvg > thresholds.critical) alertSeverity = 'critical';
  else if (rollingAvg > thresholds.warn) alertSeverity = 'warning';

  if (!alertSeverity) return;

  const statRecord = existing
    ? await prisma.messageClassStat.findUnique({ where: { id: existing.id } })
    : await prisma.messageClassStat.findFirst({
        where: {
          workspace: params.workspaceId,
          message_class: params.messageClass,
          day: dayKey,
        },
      });

  const lastAlertTime = statRecord?.last_alert ? new Date(statRecord.last_alert).getTime() : 0;
  const shouldAlert = !statRecord?.last_alert ||
    Date.now() - lastAlertTime > VERBOSITY_ALERT_COOLDOWN_MS;

  if (!shouldAlert || !statRecord) return;

  await prisma.messageClassStat.update({
    where: { id: statRecord.id },
    data: { last_alert: new Date() },
  });

  await prisma.alerts.create({
    data: {
      workspace_id: params.workspaceId,
      source_type: 'verbosity',
      source_id: params.messageClass,
      message: `Message class ${params.messageClass} averaging ${Math.round(rollingAvg)} tokens`,
      severity: alertSeverity,
      status: 'active',
      context: {
        rollingAvg,
        thresholds,
      } as unknown,
    },
  });

  await recordTelemetry({
    workspaceId: params.workspaceId,
    agentId: params.agentId,
    taskId: params.taskId,
    category: TelemetryCategory.ALERT,
    severity: alertSeverity === 'critical' ? TelemetrySeverity.CRITICAL : TelemetrySeverity.WARNING,
    eventType: 'spend.verbosity.alert',
    message: `Verbosity ${alertSeverity} for ${params.messageClass}`,
    payload: {
      messageClass: params.messageClass,
      rollingAvg,
      thresholds,
    },
  });
}
