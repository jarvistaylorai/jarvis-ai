import type { Prisma } from '@prisma/client';
import { prisma } from './database';
import { eventBus } from './event-bus';
import type { Task, TaskPriority, TaskStatus, TaskType, PaginatedResult } from '@contracts';

const taskInclude = {
  labels: { include: { label: true } },
  project: { select: { id: true, name: true } },
  phase: { select: { id: true, objective_id: true } }
} satisfies Prisma.TaskInclude;

type TaskRecord = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

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
  metadata?: Record<string, any>;
};

export type UpdateTaskInput = Partial<CreateTaskInput>;

const DEFAULT_WORKSPACE = 'business';

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
  const metadata = safeParse<Record<string, any>>(record.metadata, {});
  return metadata || {};
}

function mapTask(record: TaskRecord): Task {
  const metadata = mergeMetadata(record);
  const dependencyIds = safeParse<string[]>(record.dependencies, []);
  const labelTags = (record.labels || []).map((l) => l.label.name);
  const metadataTags = Array.isArray(metadata.tags) ? metadata.tags : [];
  const uniqueTags = Array.from(new Set([...(metadataTags as string[]), ...labelTags]));

  return {
    id: record.id,
    workspace_id: record.workspace,
    project_id: record.project_id ?? undefined,
    parent_task_id: record.parent_task_id ?? undefined,
    objective_id: record.phase?.objective_id ?? metadata.objective_id,
    title: record.title,
    description: record.description ?? undefined,
    status: coerceStatus(record.status),
    priority: coercePriority(record.priority),
    type: metadata.type ? coerceType(metadata.type) : coerceType(record.task_type),
    assigned_agent_id: record.assigned_agent ?? undefined,
    requested_by_agent_id: metadata.requested_by_agent_id,
    due_at: metadata.due_at,
    started_at: metadata.started_at,
    completed_at: metadata.completed_at,
    blocked_reason: metadata.blocked_reason,
    dependency_ids: dependencyIds,
    tags: uniqueTags,
    auto_execute: record.auto_execute,
    history_cursor: metadata.history_cursor,
    metadata,
    created_at: record.created_at ? new Date(record.created_at).toISOString() : record.updated_at.toISOString(),
    updated_at: record.updated_at.toISOString()
  };
}

export async function listTasks(params: ListTasksParams): Promise<PaginatedResult<Task>> {
  const { workspaceId = DEFAULT_WORKSPACE, limit = 25, cursor, status } = params;
  const tasks = await prisma.task.findMany({
    where: {
      workspace: workspaceId,
      ...(status ? { status } : {})
    },
    include: taskInclude,
    orderBy: { updated_at: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
  });

  const nextCursor = tasks.length === limit ? tasks[tasks.length - 1].id : undefined;
  return {
    data: tasks.map(mapTask),
    next_cursor: nextCursor
  };
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const workspace = input.workspaceId || DEFAULT_WORKSPACE;
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

  const record = await prisma.task.create({
    data: {
      workspace,
      title: input.title,
      description: input.description || null,
      status: input.status || TaskStatus.PENDING,
      priority: input.priority || TaskPriority.NORMAL,
      task_type: input.type || TaskType.ACTION,
      project_id: input.projectId || null,
      parent_task_id: input.parentTaskId || null,
      assigned_agent: input.assignedAgentId || null,
      assigned_to: input.assignedAgentId || null,
      dependencies: JSON.stringify(input.dependencyIds || []),
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
  const existing = await prisma.task.findUnique({ where: { id }, include: taskInclude });
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

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.type ? { task_type: input.type } : {}),
      ...(input.projectId !== undefined ? { project_id: input.projectId } : {}),
      ...(input.parentTaskId !== undefined ? { parent_task_id: input.parentTaskId } : {}),
      ...(input.assignedAgentId !== undefined ? { assigned_agent: input.assignedAgentId, assigned_to: input.assignedAgentId } : {}),
      ...(input.dependencyIds ? { dependencies: JSON.stringify(input.dependencyIds) } : {}),
      ...(input.autoExecute !== undefined ? { auto_execute: input.autoExecute } : {}),
      metadata: JSON.stringify(metadata)
    },
    include: taskInclude
  });

  const task = mapTask(updated);
  eventBus.publish({ type: 'task.updated', payload: task });
  return task;
}
