import type { PaginatedResult, Project, ObjectivePriority, ProjectStatus } from '@contracts';
import type { Prisma } from '@prisma/client';
import { prisma } from './database';

const projectInclude = {
  tasks: { select: { id: true, status: true, assigned_agent: true, updated_at: true } },
  objectives: { select: { id: true } }
} satisfies Prisma.ProjectInclude;

type ProjectRecord = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export type ListProjectsParams = {
  workspaceId: string;
  limit?: number;
  cursor?: string;
};

const validStatus = new Set(Object.values(ProjectStatus));
const validPriority = new Set(Object.values(ObjectivePriority));

function parseConfig(record: ProjectRecord) {
  if (!record.system_config) return {};
  try {
    return JSON.parse(record.system_config);
  } catch {
    return {};
  }
}

function coerceStatus(value?: string | null): ProjectStatus {
  if (!value) return ProjectStatus.PLANNED;
  const lowered = value.toLowerCase();
  if (validStatus.has(lowered as ProjectStatus)) {
    return lowered as ProjectStatus;
  }
  return ProjectStatus.PLANNED;
}

function coercePriority(value?: string | null): ObjectivePriority {
  if (!value) return ObjectivePriority.MEDIUM;
  const lowered = value.toLowerCase();
  if (validPriority.has(lowered as ObjectivePriority)) {
    return lowered as ObjectivePriority;
  }
  return ObjectivePriority.MEDIUM;
}

function computeProgress(record: ProjectRecord) {
  if (record.progress) return record.progress;
  const tasks = record.tasks || [];
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
}

function computeHealthScore(record: ProjectRecord, progress: number) {
  const tasks = record.tasks || [];
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const hoursSinceUpdate = (Date.now() - new Date(record.updated_at).getTime()) / 3_600_000;
  const stalenessPenalty = Math.min(40, Math.floor(hoursSinceUpdate / 6) * 2);
  const blockedPenalty = Math.min(30, blocked * 5);
  const progressPenalty = Math.max(0, Math.round((100 - progress) / 5));
  return Math.max(0, 100 - stalenessPenalty - blockedPenalty - progressPenalty);
}

function mapProject(record: ProjectRecord): Project {
  const config = parseConfig(record);
  const progress = computeProgress(record);
  const healthScore = computeHealthScore(record, progress);

  return {
    id: record.id,
    workspace_id: record.workspace,
    name: record.name,
    description: record.description ?? undefined,
    status: coerceStatus(record.status),
    priority: coercePriority(record.priority),
    owner_agent_id: config.owner_agent_id,
    health_score: healthScore,
    progress_percent: progress,
    start_date: record.created_at.toISOString(),
    due_date: config.due_date,
    active_sprint: config.active_sprint,
    objective_ids: (record.objectives || []).map((o) => o.id),
    tags: Array.isArray(config.tags) ? config.tags : [],
    metadata: config,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString()
  };
}

export async function listProjects({ workspaceId, limit = 25, cursor }: ListProjectsParams): Promise<PaginatedResult<Project>> {
  const projects = await prisma.project.findMany({
    where: { workspace: workspaceId },
    include: projectInclude,
    orderBy: { updated_at: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });
  const nextCursor = projects.length === limit ? projects[projects.length - 1].id : undefined;
  return {
    data: projects.map(mapProject),
    next_cursor: nextCursor
  };
}
