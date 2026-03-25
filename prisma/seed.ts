import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  PrismaClient,
  agent_kind,
  agent_status,
  alert_severity,
  alert_status,
  objective_priority,
  objective_status,
  project_status,
  task_priority,
  task_status,
  task_type,
  telemetry_category,
  telemetry_severity,
} from '@prisma/client';

const prisma = new PrismaClient();
const WORKSPACE_ID = process.env.SEED_WORKSPACE_ID ?? '00000000-0000-0000-0000-000000000000';
const SYSTEM_DIR = '/Users/jarvis/.openclaw/workspace/jarvis/system';

const agentStatusValues = ['idle', 'active', 'error', 'offline'] as const satisfies readonly agent_status[];
const agentKindValues = ['human', 'autonomous', 'service'] as const satisfies readonly agent_kind[];
const taskStatusValues = ['ideas', 'pending', 'in_progress', 'under_review', 'completed', 'blocked'] as const satisfies readonly task_status[];
const taskPriorityValues = ['low', 'normal', 'high', 'critical'] as const satisfies readonly task_priority[];
const taskTypeValues = ['action', 'approval', 'research', 'maintenance'] as const satisfies readonly task_type[];
const objectiveStatusValues = ['not_started', 'in_progress', 'blocked', 'completed'] as const satisfies readonly objective_status[];
const objectivePriorityValues = ['mission_critical', 'high', 'medium', 'low'] as const satisfies readonly objective_priority[];
const projectStatusValues = ['planned', 'building', 'testing', 'launched', 'paused'] as const satisfies readonly project_status[];
const alertStatusValues = ['active', 'acknowledged', 'resolved'] as const satisfies readonly alert_status[];
const alertSeverityValues = ['info', 'warning', 'critical'] as const satisfies readonly alert_severity[];
const telemetryCategoryValues = ['heartbeat', 'log', 'metric', 'event', 'error'] as const satisfies readonly telemetry_category[];
const telemetrySeverityValues = ['info', 'warning', 'critical'] as const satisfies readonly telemetry_severity[];

function coerceEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

function safeDate(value: unknown): Date {
  if (typeof value === 'string' || value instanceof Date) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string');
  }

  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch (error) {
      console.warn('Failed to parse dependency list:', error);
    }
  }

  return [];
}

function readJsonFile<T>(filename: string, fallback: T): T {
  try {
    const filePath = path.join(SYSTEM_DIR, filename);
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    console.warn(`Unable to read ${filename}:`, error);
    return fallback;
  }
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'agent';
}

async function seedAgents(data: any[]) {
  for (const raw of data) {
    const id = raw.id ?? randomUUID();
    const name = raw.name ?? 'Agent';
    const handle = (raw.handle ?? slugify(name)) || `agent-${id}`;

    await prisma.agents.upsert({
      where: { id },
      update: {
        name,
        role: raw.role ?? 'operator',
        status: coerceEnum(raw.status, agentStatusValues, 'idle'),
        current_task_id: raw.current_task_id ?? raw.current_task ?? null,
        current_project_id: raw.current_project_id ?? null,
        capability_tags: ensureStringArray(raw.capability_tags ?? raw.tags ?? []),
        utilization_percent: typeof raw.utilization_percent === 'number' ? raw.utilization_percent : 0,
        metadata: raw.metadata ?? {},
        error_state: raw.error_state ?? null,
      },
      create: {
        id,
        workspace_id: raw.workspace_id ?? WORKSPACE_ID,
        name,
        handle,
        role: raw.role ?? 'operator',
        kind: coerceEnum(raw.kind, agentKindValues, 'autonomous'),
        status: coerceEnum(raw.status, agentStatusValues, 'idle'),
        capability_tags: ensureStringArray(raw.capability_tags ?? raw.tags ?? []),
        assigned_workspace_ids: ensureStringArray(raw.assigned_workspace_ids ?? []),
        utilization_percent: typeof raw.utilization_percent === 'number' ? raw.utilization_percent : 0,
        tasks_completed_24h: typeof raw.tasks_completed_24h === 'number' ? raw.tasks_completed_24h : 0,
        metadata: raw.metadata ?? {},
        current_task_id: raw.current_task_id ?? raw.current_task ?? null,
        current_project_id: raw.current_project_id ?? null,
        current_channel: raw.current_channel ?? null,
      },
    });
  }

  console.log(`Seeded ${data.length} agents`);
}

async function seedProjects(data: any[]) {
  for (const raw of data) {
    const id = raw.id ?? randomUUID();
    await prisma.projects.upsert({
      where: { id },
      update: {
        name: raw.name ?? 'Project',
        description: raw.description ?? null,
        status: coerceEnum(raw.status, projectStatusValues, 'planned'),
        priority: coerceEnum(raw.priority, objectivePriorityValues, 'medium'),
        owner_agent_id: raw.owner_agent_id ?? raw.owner ?? null,
        health_score: typeof raw.health_score === 'number' ? raw.health_score : 100,
        progress_percent: typeof raw.progress === 'number' ? raw.progress : raw.progress_percent ?? 0,
        active_sprint: raw.active_sprint ?? null,
        tags: ensureStringArray(raw.tags ?? []),
        metadata: raw.metadata ?? {},
      },
      create: {
        id,
        workspace_id: raw.workspace_id ?? WORKSPACE_ID,
        name: raw.name ?? 'Project',
        description: raw.description ?? null,
        status: coerceEnum(raw.status, projectStatusValues, 'planned'),
        priority: coerceEnum(raw.priority, objectivePriorityValues, 'medium'),
        owner_agent_id: raw.owner_agent_id ?? raw.owner ?? null,
        health_score: typeof raw.health_score === 'number' ? raw.health_score : 100,
        progress_percent: typeof raw.progress === 'number' ? raw.progress : raw.progress_percent ?? 0,
        start_date: raw.start_date ? safeDate(raw.start_date) : null,
        due_date: raw.due_date ? safeDate(raw.due_date) : null,
        active_sprint: raw.active_sprint ?? null,
        tags: ensureStringArray(raw.tags ?? []),
        metadata: raw.metadata ?? {},
      },
    });
  }

  console.log(`Seeded ${data.length} projects`);
}

async function seedObjectives(data: any[]) {
  for (const raw of data) {
    const id = raw.id ?? randomUUID();
    await prisma.objectives.upsert({
      where: { id },
      update: {
        title: raw.title ?? 'Objective',
        description: raw.description ?? null,
        status: coerceEnum(raw.status, objectiveStatusValues, 'not_started'),
        priority: coerceEnum(raw.priority, objectivePriorityValues, 'medium'),
        progress_percent: typeof raw.progress === 'number' ? raw.progress : raw.progress_percent ?? 0,
        project_id: raw.project_id ?? null,
        owner_agent_id: raw.owner_agent_id ?? null,
        key_results: raw.key_results ?? [],
        metadata: raw.metadata ?? {},
      },
      create: {
        id,
        workspace_id: raw.workspace_id ?? WORKSPACE_ID,
        project_id: raw.project_id ?? null,
        parent_objective_id: raw.parent_objective_id ?? null,
        title: raw.title ?? 'Objective',
        description: raw.description ?? null,
        status: coerceEnum(raw.status, objectiveStatusValues, 'not_started'),
        priority: coerceEnum(raw.priority, objectivePriorityValues, 'medium'),
        progress_percent: typeof raw.progress === 'number' ? raw.progress : raw.progress_percent ?? 0,
        owner_agent_id: raw.owner_agent_id ?? null,
        target_date: raw.target_date ? safeDate(raw.target_date) : null,
        current_phase: raw.current_phase ?? null,
        key_results: raw.key_results ?? [],
        metadata: raw.metadata ?? {},
      },
    });
  }

  console.log(`Seeded ${data.length} objectives`);
}

async function seedTasks(data: any[]) {
  for (const raw of data) {
    const id = raw.id ?? randomUUID();
    const dependencies = ensureStringArray(raw.dependencies);

    await prisma.tasks.upsert({
      where: { id },
      update: {
        title: raw.title ?? 'Task',
        description: raw.description ?? null,
        status: coerceEnum(raw.status, taskStatusValues, 'pending'),
        priority: coerceEnum(raw.priority, taskPriorityValues, 'normal'),
        type: coerceEnum(raw.type, taskTypeValues, 'action'),
        project_id: raw.project_id ?? null,
        objective_id: raw.objective_id ?? null,
        assigned_agent_id: raw.assigned_agent_id ?? null,
        requested_by_agent_id: raw.requested_by_agent_id ?? null,
        due_at: raw.due_at ? safeDate(raw.due_at) : null,
        dependency_ids: dependencies,
        tags: ensureStringArray(raw.tags ?? []),
        metadata: raw.metadata ?? {},
        blocked_reason: raw.blocked_reason ?? null,
      },
      create: {
        id,
        workspace_id: raw.workspace_id ?? WORKSPACE_ID,
        project_id: raw.project_id ?? null,
        parent_task_id: raw.parent_task_id ?? null,
        objective_id: raw.objective_id ?? null,
        title: raw.title ?? 'Task',
        description: raw.description ?? null,
        status: coerceEnum(raw.status, taskStatusValues, 'pending'),
        priority: coerceEnum(raw.priority, taskPriorityValues, 'normal'),
        type: coerceEnum(raw.type, taskTypeValues, 'action'),
        assigned_agent_id: raw.assigned_agent_id ?? null,
        requested_by_agent_id: raw.requested_by_agent_id ?? null,
        due_at: raw.due_at ? safeDate(raw.due_at) : null,
        started_at: raw.started_at ? safeDate(raw.started_at) : null,
        completed_at: raw.completed_at ? safeDate(raw.completed_at) : null,
        dependency_ids: dependencies,
        tags: ensureStringArray(raw.tags ?? []),
        metadata: raw.metadata ?? {},
        auto_execute: Boolean(raw.auto_execute),
        created_at: safeDate(raw.created_at),
        updated_at: safeDate(raw.updated_at ?? raw.created_at),
      },
    });
  }

  console.log(`Seeded ${data.length} tasks`);
}

async function seedAlerts(data: any[]) {
  for (const raw of data) {
    const id = raw.id ?? randomUUID();
    await prisma.alerts.upsert({
      where: { id },
      update: {
        source_type: raw.source_type ?? raw.source ?? 'system',
        source_id: raw.source_id ?? null,
        message: raw.message ?? raw.text ?? 'Alert',
        severity: coerceEnum(raw.severity, alertSeverityValues, 'info'),
        status: coerceEnum(raw.status, alertStatusValues, 'active'),
        acknowledged_by_agent_id: raw.acknowledged_by_agent_id ?? null,
        acknowledged_at: raw.acknowledged_at ? safeDate(raw.acknowledged_at) : null,
        resolved_at: raw.resolved_at ? safeDate(raw.resolved_at) : null,
        context: raw.context ?? {},
      },
      create: {
        id,
        workspace_id: raw.workspace_id ?? WORKSPACE_ID,
        source_type: raw.source_type ?? raw.source ?? 'system',
        source_id: raw.source_id ?? null,
        message: raw.message ?? raw.text ?? 'Alert',
        severity: coerceEnum(raw.severity, alertSeverityValues, 'info'),
        status: coerceEnum(raw.status, alertStatusValues, 'active'),
        acknowledged_by_agent_id: raw.acknowledged_by_agent_id ?? null,
        acknowledged_at: raw.acknowledged_at ? safeDate(raw.acknowledged_at) : null,
        resolved_at: raw.resolved_at ? safeDate(raw.resolved_at) : null,
        context: raw.context ?? {},
      },
    });
  }

  console.log(`Seeded ${data.length} alerts`);
}

async function seedTelemetry(activity: any[]) {
  if (!activity.length) return;

  for (const raw of activity.slice(0, 200)) {
    await prisma.telemetry_events.create({
      data: {
        workspace_id: raw.workspace_id ?? WORKSPACE_ID,
        agent_id: raw.agent_id ?? null,
        task_id: raw.task_id ?? null,
        project_id: raw.project_id ?? null,
        category: coerceEnum(raw.category, telemetryCategoryValues, 'event'),
        severity: coerceEnum(raw.severity, telemetrySeverityValues, 'info'),
        event_type: raw.status ?? raw.type ?? 'ACTIVITY_LOG',
        message: raw.message ?? raw.text ?? 'Activity entry',
        payload: raw.payload ?? {},
        created_at: safeDate(raw.timestamp ?? raw.created_at),
      },
    });
  }

  console.log(`Seeded ${Math.min(activity.length, 200)} telemetry events (activity feed)`);
}

async function seedAgentContext(memory: any[]) {
  for (const raw of memory) {
    if (!raw.agent_id) continue;
    const id = raw.id ?? randomUUID();
    const fileName = `${raw.memory_type ?? 'memory'}-${id}.json`;
    const content = typeof raw.content === 'string' ? raw.content : JSON.stringify(raw.content ?? {});

    await prisma.agent_context_files.upsert({
      where: { id },
      update: {
        agent_id: raw.agent_id,
        file_name: fileName,
        content,
      },
      create: {
        id,
        agent_id: raw.agent_id,
        file_name: fileName,
        content,
      },
    });
  }

  console.log(`Seeded ${memory.length} agent context files`);
}

async function seedSystemState(data: any) {
  if (!data || typeof data !== 'object') return;
  const id = data.id ?? 'global';

  await prisma.systemState.upsert({
    where: { id },
    update: {
      workspace: data.workspace ?? WORKSPACE_ID,
      status: data.status ?? 'NORMAL',
      active_agents: data.active_agents ?? 0,
      pending_tasks: data.pending_tasks ?? 0,
      blocked_tasks: data.blocked_tasks ?? 0,
      last_evaluated_at: data.last_evaluated_at ?? new Date().toISOString(),
    },
    create: {
      id,
      workspace: data.workspace ?? WORKSPACE_ID,
      status: data.status ?? 'NORMAL',
      active_agents: data.active_agents ?? 0,
      pending_tasks: data.pending_tasks ?? 0,
      blocked_tasks: data.blocked_tasks ?? 0,
      last_evaluated_at: data.last_evaluated_at ?? new Date().toISOString(),
    },
  });

  console.log('Seeded system state record');
}

async function main() {
  const agents = readJsonFile('agents.json', [] as any[]);
  const projects = readJsonFile('projects.json', [] as any[]);
  const tasks = readJsonFile('tasks.json', [] as any[]);
  const activity = readJsonFile('activity.json', [] as any[]);
  const systemState = readJsonFile('system_state.json', {} as any);
  const objectives = readJsonFile('objectives.json', [] as any[]);
  const alerts = readJsonFile('alerts.json', [] as any[]);
  const memory = readJsonFile('agent_memory.json', [] as any[]);

  await seedAgents(agents);
  await seedProjects(projects);
  await seedObjectives(objectives);
  await seedTasks(tasks);
  await seedAlerts(alerts);
  await seedTelemetry(activity);
  await seedAgentContext(memory);
  await seedSystemState(systemState);

  console.log('✅ Seeding finished.');
}

main()
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
