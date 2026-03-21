import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const SYSTEM_DIR = '/Users/jarvis/.openclaw/workspace/jarvis/system';

function readJsonFile(filename: string) {
  try {
    const filePath = path.join(SYSTEM_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

async function main() {
  const agents = readJsonFile('agents.json') || [];
  const projects = readJsonFile('projects.json') || [];
  const tasks = readJsonFile('tasks.json') || [];
  const activity = readJsonFile('activity.json') || [];
  const systemState = readJsonFile('system_state.json') || {};
  const objectives = readJsonFile('objectives.json') || [];
  const objectiveLinks = readJsonFile('objective_links.json') || [];
  const alerts = readJsonFile('alerts.json') || [];
  const memory = readJsonFile('agent_memory.json') || [];
  const rules = readJsonFile('automation_rules.json') || [];

  for (const a of agents) {
    await prisma.agent.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, name: a.name, role: a.role, status: a.status, current_task: a.current_task || null }
    });
  }

  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      // @ts-ignore
      create: { id: p.id, name: p.name, status: p.status || p.stage || 'IDEA', progress: p.progress || 0 }
    });
  }

  for (const t of tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: { 
        id: t.id, 
        title: t.title, 
        status: t.status, 
        priority: t.priority, 
        project_id: t.project_id || null, 
        assigned_agent: t.assigned_agent || null, 
        dependencies: JSON.stringify(t.dependencies || []), 
        created_at: t.created_at || new Date().toISOString() 
      }
    });
  }

  for (const act of activity) {
    await prisma.activity.upsert({
      where: { id: act.id },
      update: {},
      create: { id: act.id, agent_id: String(act.agent_id), message: act.message, status: act.status, timestamp: act.timestamp || new Date().toISOString() }
    });
  }

  if (systemState.id) {
    await prisma.systemState.upsert({
      where: { id: systemState.id },
      update: {},
      create: { 
        id: systemState.id, 
        status: systemState.status || "NORMAL", 
        active_agents: systemState.active_agents || 0,
        pending_tasks: systemState.pending_tasks || 0,
        blocked_tasks: systemState.blocked_tasks || 0,
        last_evaluated_at: systemState.last_evaluated_at || new Date().toISOString()
      }
    });
  }

  for (const o of objectives) {
    await prisma.objective.upsert({
      where: { id: o.id },
      update: {},
      create: { id: o.id, title: o.title, description: o.description, status: o.status, priority: o.priority, progress: o.progress || 0, created_at: o.created_at || new Date().toISOString() }
    });
  }

  for (const al of alerts) {
    await prisma.alert.upsert({
      where: { id: al.id },
      update: {},
      create: { id: al.id, type: al.type, message: al.message, severity: al.severity, status: al.status, created_at: al.created_at || new Date().toISOString() }
    });
  }

  for (const m of memory) {
    await prisma.agentMemory.upsert({
      where: { id: m.id },
      update: {},
      create: { id: m.id, agent_id: String(m.agent_id), memory_type: m.memory_type, content: m.content, created_at: m.created_at || new Date().toISOString() }
    });
  }

  for (const r of rules) {
    await prisma.automationRule.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, trigger: r.trigger, condition: r.condition || null, action: r.action, enabled: r.enabled !== false }
    });
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
