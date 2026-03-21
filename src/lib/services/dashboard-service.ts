import { listProjects } from './project-service';
import { listAgents } from './agent-service';
import { listTasks } from './task-service';
import { listAlerts } from './alert-service';
import { getTelemetrySummary } from './telemetry-service';

export async function getDashboardSnapshot(workspaceId: string) {
  const [projects, agents, tasks, alerts, telemetry] = await Promise.all([
    listProjects({ workspaceId, limit: 10 }),
    listAgents({ workspaceId }),
    listTasks({ workspaceId, limit: 25 }),
    listAlerts({ workspaceId, limit: 10 }),
    getTelemetrySummary(workspaceId)
  ]);

  return {
    workspace_id: workspaceId,
    projects: projects.data,
    agents: agents.data,
    tasks: tasks.data,
    alerts: alerts.data,
    telemetry,
    meta: {
      next: {
        projects: projects.next_cursor,
        tasks: tasks.next_cursor,
        alerts: alerts.next_cursor
      },
      counts: {
        active_projects: projects.data.filter((p) => p.progress_percent > 0 && p.progress_percent < 100).length,
        active_agents: agents.data.filter((a) => a.status === 'active').length,
        pending_tasks: tasks.data.filter((t) => t.status === 'pending').length,
        blocked_tasks: tasks.data.filter((t) => t.status === 'blocked').length
      }
    }
  };
}
