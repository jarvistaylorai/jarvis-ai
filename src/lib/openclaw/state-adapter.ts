import fs from 'fs/promises';
import path from 'path';

const DEFAULT_WORKSPACE_ROOT = path.resolve(process.cwd(), '..', '..');
const STATE_ROOT = process.env.OPENCLAW_STATE_ROOT || DEFAULT_WORKSPACE_ROOT;
const SYSTEM_DIR = path.join(STATE_ROOT, 'jarvis', 'system');

async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  const target = path.join(SYSTEM_DIR, fileName);
  try {
    const raw = await fs.readFile(target, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.warn(`[openclaw-state] Failed to read ${fileName}:`, error.message);
    }
    return fallback;
  }
}

export async function loadOpenClawSnapshot() {
  const [agents, tasks, projects, objectives, alerts, activity, system_state] = await Promise.all([
    readJsonFile('agents.json', []),
    readJsonFile('tasks.json', []),
    readJsonFile('projects.json', []),
    readJsonFile('objectives.json', []),
    readJsonFile('alerts.json', []),
    readJsonFile('activity.json', []),
    readJsonFile('system_state.json', null)
  ]);

  return {
    agents,
    tasks,
    projects,
    objectives,
    alerts,
    telemetry: {
      events: (activity || []).map((evt: any) => ({
        ...evt,
        created_at: evt.timestamp || evt.created_at || new Date().toISOString()
      })),
      stats: {
        total: (activity || []).length,
        errors: (activity || []).filter((evt: any) => evt.status === 'error').length,
        heartbeats: (activity || []).filter((evt: any) => evt.category === 'heartbeat').length
      }
    },
    system_state: system_state || {
      status: 'NORMAL',
      active_agents: agents.filter((a: any) => a.status === 'active').length,
      pending_tasks: tasks.filter((t: any) => t.status === 'pending').length,
      blocked_tasks: tasks.filter((t: any) => t.status === 'blocked').length,
      last_evaluated_at: new Date().toISOString()
    }
  };
}
