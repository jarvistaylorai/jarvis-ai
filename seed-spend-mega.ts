import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing spend logs...');
  await prisma.spendLog.deleteMany({});
  await prisma.spendLimit.deleteMany({});

  console.log('Inserting budget limits...');
  await prisma.spendLimit.create({
    data: {
      id: "global",
      global_daily_limit: 150.0,
      per_agent_limit: 20.0,
      per_task_limit: 5.0,
      per_model_limit: 50.0
    }
  });

  console.log('Seeding spend logs...');
  let agents = await prisma.agent.findMany();
  if (agents.length === 0) {
    console.log('No agents found. Creating default agents...');
    await prisma.agent.createMany({
      data: [
        { id: "agent_1", name: "Jarvis", role: "Orchestrator", status: "active" },
        { id: "agent_2", name: "Scout", role: "Researcher", status: "active" },
        { id: "agent_3", name: "Quill", role: "Writer", status: "idle" }
      ]
    });
    agents = await prisma.agent.findMany();
  }

  const now = Date.now();
  const logs = [];
  
  const models = [
    { name: "gpt-4o", provider: "openai", input: 0.005, output: 0.015 },
    { name: "claude-3.5-sonnet", provider: "anthropic", input: 0.003, output: 0.015 },
    { name: "gemini-1.5-flash", provider: "google", input: 0.0005, output: 0.001 }
  ];

  for (let i = 0; i < 200; i++) {
    const timestamp = new Date(now - Math.random() * 14 * 24 * 60 * 60 * 1000);
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const model = models[Math.floor(Math.random() * models.length)];
    
    const inputTokens = Math.floor(Math.random() * 2000) + 100;
    const outputTokens = Math.floor(Math.random() * 1000) + 50;
    const tokensTotal = inputTokens + outputTokens;
    
    const cost = (inputTokens / 1000) * model.input + (outputTokens / 1000) * model.output;

    logs.push({
      created_at: timestamp,
      agent_id: agent.id,
      model: model.name,
      provider: model.provider,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      tokens_total: tokensTotal,
      cost: cost,
      task_id: "test_" + i,
      project_id: "proj_test"
    });
  }

  await prisma.spendLog.createMany({
    data: logs
  });

  // Inject a large spike for today to trigger Anomaly detection
  const today = new Date();
  await prisma.spendLog.create({
    data: {
      created_at: today,
      agent_id: agents[0].id,
      model: "gpt-4o",
      provider: "openai",
      tokens_input: 100000,
      tokens_output: 50000,
      tokens_total: 150000,
      cost: (100000 / 1000) * 0.005 + (50000 / 1000) * 0.015,
      task_id: "spike_test",
      project_id: "proj_test"
    }
  });

  console.log(`Seeded ${logs.length + 1} spend logs successfully.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
