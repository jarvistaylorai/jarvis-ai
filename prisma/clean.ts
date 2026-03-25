import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WORKSPACE_ID = process.env.SEED_WORKSPACE_ID ?? '00000000-0000-0000-0000-000000000000';

async function main() {
  console.log('🧹 Resetting Mission Control database state...');

  await prisma.$transaction([
    prisma.task_checklist_items.deleteMany({}),
    prisma.task_checklists.deleteMany({}),
    prisma.task_comments.deleteMany({}),
    prisma.task_labels.deleteMany({}),
    prisma.task_attachments.deleteMany({}),
    prisma.labels.deleteMany({ where: { project_id: { not: 'global' } } }),
    prisma.telemetry_events.deleteMany({}),
    prisma.tasks.deleteMany({}),
    prisma.objectives.deleteMany({}),
    prisma.projects.deleteMany({}),
    prisma.alerts.deleteMany({}),
    prisma.agent_context_files.deleteMany({}),
    prisma.agent_model_config.deleteMany({}),
    prisma.model_routing_rule.deleteMany({}),
    prisma.model_usage_log.deleteMany({}),
  ]);

  await prisma.agents.updateMany({
    data: {
      status: 'idle',
      current_task_id: null,
      current_project_id: null,
      error_state: null,
    },
  });

  await prisma.systemState.upsert({
    where: { id: 'global' },
    update: {
      status: 'IDLE',
      active_agents: 0,
      pending_tasks: 0,
      blocked_tasks: 0,
      last_evaluated_at: new Date().toISOString(),
      workspace: WORKSPACE_ID,
    },
    create: {
      id: 'global',
      workspace: WORKSPACE_ID,
      status: 'IDLE',
      active_agents: 0,
      pending_tasks: 0,
      blocked_tasks: 0,
      last_evaluated_at: new Date().toISOString(),
    },
  });

  console.log('✅ Database reset complete.');
}

main()
  .catch((error) => {
    console.error('Failed to clean database', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
