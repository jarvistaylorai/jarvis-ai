import { Alert, AlertSeverity, AlertStatus, PaginatedResult } from '@contracts';
import { prisma } from './database';
import { eventBus } from './event-bus';
import { getWorkspaceId } from '../workspace-utils';
import { Alert } from '@contracts';

export type ListAlertsParams = {
  workspaceId: string;
  limit?: number;
  cursor?: string;
  status?: AlertStatus;
};

export type CreateAlertInput = {
  workspaceId: string;
  sourceType: Alert['source_type'];
  sourceId?: string;
  message: string;
  severity: AlertSeverity;
  status?: AlertStatus;
  context?: Record<string, unknown>;
};

const validSeverity = new Set(Object.values(AlertSeverity));
const validStatus = new Set(Object.values(AlertStatus));

function normalizeSeverity(value: string): AlertSeverity {
  const lowered = value.toLowerCase();
  if (validSeverity.has(lowered as AlertSeverity)) {
    return lowered as AlertSeverity;
  }
  return AlertSeverity.INFO;
}

function normalizeStatus(value: string): AlertStatus {
  const lowered = value.toLowerCase();
  if (validStatus.has(lowered as AlertStatus)) {
    return lowered as AlertStatus;
  }
  return AlertStatus.ACTIVE;
}

function mapAlert(record: Record<string, unknown>): Alert {
  return {
    id: record.id,
    workspace_id: record.workspace_id,
    source_type: record.source_type,
    source_id: record.source_id ?? undefined,
    message: record.message,
    severity: normalizeSeverity(record.severity),
    status: normalizeStatus(record.status),
    acknowledged_by_agent_id: record.acknowledged_by_agent_id ?? undefined,
    acknowledged_at: record.acknowledged_at?.toISOString?.() || undefined,
    resolved_at: record.resolved_at?.toISOString?.() || undefined,
    context: record.context ? JSON.parse(record.context) : undefined,
    created_at: record.created_at ? new Date(record.created_at).toISOString() : new Date().toISOString(),
    updated_at: record.updated_at?.toISOString?.() || new Date().toISOString()
  };
}

export async function listAlerts({ workspaceId, limit = 25, cursor, status }: ListAlertsParams): Promise<PaginatedResult<Alert>> {
  const mappedWorkspaceId = getWorkspaceId(workspaceId);
  const alerts = await prisma.alerts.findMany({
    where: { workspace_id: mappedWorkspaceId, ...(status ? { status } : {}) },
    orderBy: { updated_at: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });
  const nextCursor = alerts.length === limit ? alerts[alerts.length - 1].id : undefined;
  return {
    data: alerts.map(mapAlert),
    next_cursor: nextCursor
  };
}

export async function createAlert(input: CreateAlertInput): Promise<Alert> {
  const mappedWorkspaceId = getWorkspaceId(input.workspaceId);
  const record = await prisma.alerts.create({
    data: {
      workspace_id: mappedWorkspaceId,
      source_type: input.sourceType,
      message: input.message,
      severity: input.severity,
      status: input.status || AlertStatus.ACTIVE,
      context: input.context ? JSON.stringify(input.context) : null,
      created_at: new Date().toISOString()
    }
  });
  const alert = mapAlert(record);
  eventBus.publish({ type: 'alert.created', payload: alert });
  return alert;
}
