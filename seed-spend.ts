import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing spend logs...');
  await prisma.spendLog.deleteMany({});

  console.log('Seeding spend logs...');
  const agents = await prisma.agent.findMany();
  const models = await prisma.model.findMany();
  const tasks = await prisma.task.findMany();

  if (agents.length === 0 || models.length === 0) {
    console.log('Please ensure you have agents and models in DB first.');
    return;
  }

  const now = Date.now();
  const logs = [];

  for (let i = 0; i < 150; i++) {
    // Generate timestamps over the last 14 days
    const timestamp = new Date(now - Math.random() * 14 * 24 * 60 * 60 * 1000);
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const model = models[Math.floor(Math.random() * models.length)];
    const task = tasks.length > 0 ? tasks[Math.floor(Math.random() * tasks.length)] : null;
    
    const tokens = Math.floor(Math.random() * 5000) + 500;
    // rough cost estimation based on model capability or random
    const cost = (tokens / 1000) * (model.cost_per_1k || 0.05);

    logs.push({
      timestamp,
      agent_id: agent.id,
      model_id: model.id,
      tokens,
      cost,
      task_id: task?.id || null
    });
  }

  await prisma.spendLog.createMany({
    data: logs
  });

  console.log(`Seeded ${logs.length} spend logs successfully.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
