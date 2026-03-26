import { listProjects } from './project-service';
import { listAgents } from './agent-service';
import { listTasks } from './task-service';
import { listAlerts } from './alert-service';
import { getTelemetrySummary } from './telemetry-service';
import { prisma } from './database';
import { getWorkspaceId } from '../workspace-utils';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@contracts';

export async function getDashboardSnapshot(workspaceId: string) {
  const mappedWorkspaceId = getWorkspaceId(workspaceId);
  const [projects, agents, tasks, alerts, telemetry, systemState, objectives, memoryCount, latestMemory] = await Promise.all([
    listProjects({ workspaceId, limit: 10 }),
    listAgents({ workspaceId }),
    listTasks({ workspaceId, limit: 25 }),
    listAlerts({ workspaceId, limit: 10 }),
    getTelemetrySummary(workspaceId),
    prisma.systemState.findUnique({ where: { id: 'global' } }),
    prisma.objectives.findMany({ where: { workspace_id: mappedWorkspaceId } }),
    prisma.agent_context_files.count(),
    prisma.agent_context_files.findFirst({ orderBy: { updated_at: 'desc' }, select: { updated_at: true } })
  ]);

  return {
    workspace_id: workspaceId,
    projects: projects.data,
    agents: agents.data,
    tasks: tasks.data,
    alerts: alerts.data,
    telemetry,
    system_state: systemState,
    objectives,
    meta: {
      next: {
        projects: projects.next_cursor,
        tasks: tasks.next_cursor,
        alerts: alerts.next_cursor
      },
      counts: {
        active_projects: projects.data.filter((p: Project) => p.progress_percent > 0 && p.progress_percent < 100).length,
        active_agents: agents.data.filter((a: Agent) => a.status === 'active').length,
        pending_tasks: tasks.data.filter((t: Task) => t.status === 'pending').length,
        blocked_tasks: tasks.data.filter((t: Task) => t.status === 'blocked').length
      },
      memory: {
        count: memoryCount,
        latest_ingestion: latestMemory?.updated_at?.toISOString() || null,
        status: memoryCount > 0 ? 'READY' : 'OFFLINE'
      }
    }
  };
}
