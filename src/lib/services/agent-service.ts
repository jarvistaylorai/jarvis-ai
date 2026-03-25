import {  PaginatedResult, Agent, AgentStatus, AgentKind  } from '@contracts';
import { prisma } from './database';
import { eventBus } from './event-bus';
import { getWorkspaceId } from '../workspace-utils';

export type CreateAgentInput = {
  workspaceId: string;
  name: string;
  role: string;
  description?: string;
  capabilityTags?: string[];
  status?: AgentStatus;
  load?: 'low' | 'normal' | 'high';
  layer?: string;
};

export type ListAgentsParams = {
  workspaceId: string;
};

export type UpdateAgentInput = {
  status?: AgentStatus;
  currentTaskId?: string;
  currentProjectId?: string;
  currentChannel?: string;
  capabilityTags?: string[];
  utilizationPercent?: number;
  metadata?: Record<string, any>;
};

// Replaced by workspace-utils
const loadToUtilization: Record<string, number> = {
  low: 25,
  normal: 55,
  high: 85
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 48);

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapAgent(record: any, completedMap: Map<string, number>): Agent {
  const capabilityTags = parseJson<string[]>(record.capability_tags, []);
  const metadata = parseJson<Record<string, any>>(record.metadata, {});

  const utilization =
    typeof record.utilization_percent === 'number'
      ? record.utilization_percent
      : loadToUtilization[0] ?? 50;

  const status = (record.status?.toLowerCase() as AgentStatus) || AgentStatus.IDLE;

  return {
    id: record.id,
    workspace_id: record.workspace,
    name: record.name,
    handle: slugify(record.name),
    kind: record.id === 'me' ? AgentKind.HUMAN : AgentKind.AUTONOMOUS,
    status,
    role: record.role,
    capability_tags: capabilityTags,
    assigned_workspace_ids: [getWorkspaceId(record.workspace_id)],
    current_task_id: record.current_task_id || undefined,
    current_project_id: record.current_project_id || undefined,
    current_channel: record.current_channel || undefined,
    utilization_percent: utilization,
    tasks_completed_24h: completedMap.get(record.id) || 0,
    last_heartbeat_at: record.last_active_at?.toISOString?.() || record.last_active_at,
    error_state: metadata.error_state,
    metadata: {
      ...metadata,
      layer: record.metadata?.layer || 'core',
      description: record.metadata?.description || record.description
    },
    created_at: record.created_at?.toISOString?.() || new Date().toISOString(),
    updated_at: record.updated_at?.toISOString?.() || new Date().toISOString()
  };
}

export async function listAgents({ workspaceId }: ListAgentsParams): Promise<PaginatedResult<Agent>> {
  const mappedWorkspaceId = getWorkspaceId(workspaceId);
  const [agents, completed] = await Promise.all([
    prisma.agents.findMany({ 
      where: { 
        workspace_id: mappedWorkspaceId,
        NOT: { handle: { startsWith: 'deleted-' } }
      } 
    }),
    prisma.tasks.groupBy({
      by: ['assigned_agent_id'],
      where: {
        workspace_id: mappedWorkspaceId,
        status: 'completed',
        updated_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      _count: { _all: true }
    })
  ]);

  const completedMap = new Map<string, number>();
  completed.forEach((row) => {
    if (row.assigned_agent_id) {
      completedMap.set(row.assigned_agent_id, row._count._all);
    }
  });

  const data = agents.map((agent) => mapAgent(agent, completedMap));
  return { data, next_cursor: undefined };
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const record = await prisma.agents.create({
    data: {
      workspace_id: getWorkspaceId(input.workspaceId),
      name: input.name,
      handle: slugify(input.name),
      role: input.role,
      capability_tags: input.capabilityTags || [],
      status: input.status || AgentStatus.IDLE,
      metadata: {
        layer: input.layer || 'core',
        description: input.description || null
      }
    }
  });
  const completedMap = new Map<string, number>();
  return mapAgent(record, completedMap);
}

export async function updateAgent(id: string, input: UpdateAgentInput): Promise<Agent> {
  const existing = await prisma.agents.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Agent not found');
  }

  const updated = await prisma.agents.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.currentTaskId !== undefined ? { current_task_id: input.currentTaskId } : {}),
      ...(input.currentProjectId !== undefined ? { current_project_id: input.currentProjectId } : {}),
      ...(input.currentChannel !== undefined ? { current_channel: input.currentChannel } : {}),
      ...(input.capabilityTags ? { capability_tags: input.capabilityTags } : {}),
      ...(input.utilizationPercent !== undefined ? { utilization_percent: input.utilizationPercent } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {})
    }
  });

  const completedMap = new Map<string, number>();
  const agent = mapAgent(updated, completedMap);
  eventBus.publish({ type: 'agent.updated', payload: agent });
  return agent;
}
