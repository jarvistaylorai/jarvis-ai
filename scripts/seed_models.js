const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const openai = await prisma.model.create({
    data: {
      name: 'GPT-4o',
      provider: 'openai',
      cost_per_1k: 5.00,
      capabilities: JSON.stringify(['reasoning', 'coding', 'vision']),
      status: 'active'
    }
  });

  const claude = await prisma.model.create({
    data: {
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      cost_per_1k: 3.00,
      capabilities: JSON.stringify(['reasoning', 'coding']),
      status: 'active'
    }
  });

  const gemini = await prisma.model.create({
    data: {
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      cost_per_1k: 0.15,
      capabilities: JSON.stringify(['fast', 'cheap', 'vision']),
      status: 'fallback'
    }
  });

  await prisma.providerSettings.createMany({
    data: [
      { provider: 'openai', status: 'connected' },
      { provider: 'anthropic', status: 'connected' },
      { provider: 'google', status: 'connected' },
    ]
  });

  const agents = await prisma.agent.findMany();
  
  if (agents.length > 0) {
    await prisma.agentModelConfig.create({
      data: {
        agent_id: agents[0].id,
        primary_model_id: claude.id,
        fallback_model_id: openai.id,
        max_cost: 10.0,
        mode: 'intelligence'
      }
    });

    await prisma.modelUsageLog.create({
      data: {
        model_id: claude.id,
        agent_id: agents[0].name,
        tokens: 4500,
        cost: 0.0135,
        task: 'Refactoring workspace architecture',
        duration: 12000
      }
    });
    
    await prisma.modelUsageLog.create({
      data: {
        model_id: openai.id,
        agent_id: agents[0].name,
        tokens: 1200,
        cost: 0.006,
        task: 'Generating PR description',
        duration: 3400
      }
    });
  }

  await prisma.modelRoutingRule.create({
    data: {
      task_type: 'coding',
      model_id: claude.id,
      priority: 10
    }
  });

  console.log('Seeded model data.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
