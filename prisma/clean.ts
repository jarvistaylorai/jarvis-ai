import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Purge all execution data
  await prisma.task.deleteMany({});
  await prisma.objective.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.agentMemory.deleteMany({});
  
  // We'll keep the Automation Rules since they are system level triggers, but you can configure them via UI.
  // Actually, to be safe "no hardcoded stuff", let's clear them too.
  await prisma.automationRule.deleteMany({});
  
  // Reset agents to idle
  await prisma.agent.updateMany({
    data: { status: 'idle', current_task: null }
  });

  // Reset system state
  await prisma.systemState.updateMany({
    data: {
      status: 'IDLE',
      active_agents: 0,
      pending_tasks: 0,
      blocked_tasks: 0
    }
  });

  const agents = await prisma.agent.findMany();
  const projects = await prisma.project.findMany();
  
  console.log("=== DB CLEANUP COMPLETE ===");
  console.log(`Agents Remaining: ${JSON.stringify(agents, null, 2)}`);
  console.log(`Projects Remaining: ${JSON.stringify(projects, null, 2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
