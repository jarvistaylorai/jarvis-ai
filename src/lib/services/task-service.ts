import type { Prisma } from '@prisma/client';
import { prisma } from './database';
import { eventBus } from './event-bus';
import { Task, TaskPriority, TaskStatus, TaskType, PaginatedResult } from '@contracts';
import { getWorkspaceId } from '../workspace-utils';
import { Task } from '@contracts';

const taskInclude = {
  objectives: { select: { id: true } },
  task_comments: { orderBy: { created_at: 'asc' } as const },
  task_checklists: { include: { task_checklist_items: { orderBy: { position: 'asc' } as const } }, orderBy: { created_at: 'asc' } as const },
  task_labels: { include: { labels: true } },
  task_attachments: { orderBy: { created_at: 'asc' } as const }
};

type TaskRecord = Prisma.tasksGetPayload<{ include: typeof taskInclude }>;

export type ListTasksParams = {
  workspaceId: string;
  limit?: number;
  cursor?: string;
  status?: TaskStatus;
};

export type CreateTaskInput = {
  workspaceId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  projectId?: string;
  parentTaskId?: string;
  objectiveId?: string;
  assignedAgentId?: string;
  requestedByAgentId?: string;
  dependencyIds?: string[];
  tags?: string[];
  autoExecute?: boolean;
  dueAt?: string;
  startedAt?: string;
  completedAt?: string;
  blockedReason?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateTaskInput = Partial<CreateTaskInput>;

// Replaced by workspace-utils

const validTaskStatuses = new Set(Object.values(TaskStatus));
const validTaskPriorities = new Set(Object.values(TaskPriority));
const validTaskTypes = new Set(Object.values(TaskType));

function safeParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function coerceStatus(status: string | null | undefined): TaskStatus {
  if (status && validTaskStatuses.has(status as TaskStatus)) {
    return status as TaskStatus;
  }
  return TaskStatus.PENDING;
}

function coercePriority(priority: string | null | undefined): TaskPriority {
  if (!priority) return TaskPriority.NORMAL;
  const lowered = priority.toLowerCase();
  if (validTaskPriorities.has(lowered as TaskPriority)) {
    return lowered as TaskPriority;
  }
  return TaskPriority.NORMAL;
}

function coerceType(type: string | null | undefined): TaskType {
  if (!type) return TaskType.ACTION;
  const lowered = type.toLowerCase();
  if (validTaskTypes.has(lowered as TaskType)) {
    return lowered as TaskType;
  }
  return TaskType.ACTION;
}

function mergeMetadata(record: TaskRecord) {
  const metadata = safeParse<Record<string, unknown>>(record.metadata, {});
  return metadata || {};
}

function mapTask(record: TaskRecord): Task {
  const metadata = mergeMetadata(record);
  const dependencyIds = safeParse<string[]>(record.dependency_ids, []);
  const labelTags = (record.task_labels || []).map((l: Record<string, unknown>) => l.labels?.name).filter(Boolean);
  const metadataTags = Array.isArray(metadata.tags) ? metadata.tags : [];
  const uniqueTags = Array.from(new Set([...(metadataTags as string[]), ...labelTags]));

  return {
    id: record.id,
    workspace_id: record.workspace_id,
    project_id: record.project_id ?? undefined,
    parent_task_id: record.parent_task_id ?? undefined,
    objective_id: record.phase?.objective_id ?? metadata.objective_id,
    title: record.title,
    description: record.description ?? undefined,
    status: coerceStatus(record.status),
    priority: coercePriority(record.priority),
    type: metadata.type ? coerceType(metadata.type) : coerceType(record.type),
    assigned_agent_id: record.assigned_agent_id ?? undefined,
    assigned_to: metadata.assigned_to,
    requested_by_agent_id: metadata.requested_by_agent_id,
    due_date: metadata.due_at || record.due_at,
    start_date: metadata.started_at || record.started_at,
    completed_at: metadata.completed_at || record.completed_at,
    blocked_reason: metadata.blocked_reason,
    dependency_ids: dependencyIds,
    tags: uniqueTags,
    auto_execute: record.auto_execute,
    history_cursor: metadata.history_cursor,
    metadata,
    comments: record.task_comments || [],
    attachments: record.task_attachments || [],
    checklists: (record.task_checklists || []).map((c: Task) => ({ ...c, items: c.task_checklist_items || [] })),
    labels: (record.task_labels || []).map((tl: Record<string, unknown>) => ({ label: tl.labels })),
    created_at: record.created_at ? new Date(record.created_at).toISOString() : record.updated_at.toISOString(),
    updated_at: record.updated_at.toISOString()
  } as unknown as Task;
}

export async function listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>> {
  const { workspaceId, limit = 25, cursor, status } = params;
  const mappedWorkspaceId = getWorkspaceId(workspaceId);
  const tasksList = await prisma.tasks.findMany({
    where: {
      workspace_id: mappedWorkspaceId,
      ...(status ? { status } : {})
    },
    include: taskInclude,
    orderBy: { updated_at: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });

  const nextCursor = tasksList.length === limit ? tasksList[tasksList.length - 1].id : undefined;
  return {
    data: tasksList.map(mapTask),
    next_cursor: nextCursor
  };
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const mappedWorkspaceId = getWorkspaceId(input.workspaceId);
  const metadata = {
    ...input.metadata,
    tags: input.tags || input.metadata?.tags || [],
    due_at: input.dueAt ?? input.metadata?.due_at,
    started_at: input.startedAt ?? input.metadata?.started_at,
    completed_at: input.completedAt ?? input.metadata?.completed_at,
    blocked_reason: input.blockedReason ?? input.metadata?.blocked_reason,
    requested_by_agent_id: input.requestedByAgentId ?? input.metadata?.requested_by_agent_id,
    objective_id: input.objectiveId ?? input.metadata?.objective_id
  };

  const record = await prisma.tasks.create({
    data: {
      workspace_id: mappedWorkspaceId,
      title: input.title,
      description: input.description || null,
      status: input.status || TaskStatus.PENDING,
      priority: input.priority || TaskPriority.NORMAL,
      type: input.type || TaskType.ACTION,
      project_id: input.projectId || null,
      parent_task_id: input.parentTaskId || null,
      assigned_agent_id: input.assignedAgentId || null,
      dependency_ids: input.dependencyIds || [],
      auto_execute: input.autoExecute ?? false,
      metadata: JSON.stringify(metadata),
      created_at: new Date().toISOString()
    },
    include: taskInclude
  });

  const task = mapTask(record);
  eventBus.publish({ type: 'task.updated', payload: task });
  return task;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const existing = await prisma.tasks.findUnique({ where: { id }, include: taskInclude });
  if (!existing) {
    throw new Error('Task not found');
  }

  const metadata = {
    ...mergeMetadata(existing),
    ...input.metadata,
    ...(input.tags ? { tags: input.tags } : {}),
    ...(input.dueAt ? { due_at: input.dueAt } : {}),
    ...(input.startedAt ? { started_at: input.startedAt } : {}),
    ...(input.completedAt ? { completed_at: input.completedAt } : {}),
    ...(input.blockedReason ? { blocked_reason: input.blockedReason } : {}),
    ...(input.requestedByAgentId ? { requested_by_agent_id: input.requestedByAgentId } : {}),
    ...(input.objectiveId ? { objective_id: input.objectiveId } : {})
  };

  const updated = await prisma.tasks.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.projectId !== undefined ? { project_id: input.projectId } : {}),
      ...(input.parentTaskId !== undefined ? { parent_task_id: input.parentTaskId } : {}),
      ...(input.assignedAgentId !== undefined ? { assigned_agent_id: input.assignedAgentId } : {}),
      ...(input.dependencyIds ? { dependency_ids: input.dependencyIds } : {}),
      ...(input.autoExecute !== undefined ? { auto_execute: input.autoExecute } : {}),
      metadata: JSON.stringify(metadata)
    },
    include: taskInclude
  });

  const task = mapTask(updated);
  eventBus.publish({ type: 'task.updated', payload: task });
  return task;
}
