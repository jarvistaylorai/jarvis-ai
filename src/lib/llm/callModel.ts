import { PrismaClient } from '@prisma/client';
import { calculateCost } from '@/lib/costs/modelPricing';

const prisma = new PrismaClient();

// This is a wrapper around your actual model calling implementation.
export async function callModelWithTracking({
  model,
  provider,
  agent_id,
  task_id,
  project_id,
  prompt
}: {
  model: string;
  provider: string;
  agent_id: string;
  task_id?: string;
  project_id?: string;
  prompt: string;
}) {
  // 1. BUDGET ENFORCEMENT
  // Fetch today's spend for this agent
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [agentSpendLogs, limits] = await Promise.all([
    prisma.spendLog.findMany({
      where: {
        agent_id,
        created_at: { gte: todayStart }
      }
    }),
    prisma.spendLimit.findUnique({ where: { id: "global" } })
  ]);

  const agentSpendToday = agentSpendLogs.reduce((sum, log) => sum + log.cost, 0);
  
  // Default limits if not set in DB
  const agentLimit = limits?.per_agent_limit ?? 10.0;

  if (agentSpendToday >= agentLimit) {
     throw new Error(`Budget Exceeded: Agent ${agent_id} has exceeded its daily limit of $${agentLimit.toFixed(2)} (Spent: $${agentSpendToday.toFixed(2)}).`);
  }

  // 2. ACTUAL MODEL CALL (Mocked inline or imported from your actual LLM library)
  // For example: const response = await openai.chat.completions.create(...)
  // Mocking response for architectural completeness:
  console.log(`[LLM Exec] Calling ${model} via ${provider} for Agent: ${agent_id}`);
  
  // Simulate network delay & token generation
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const inputTokens = Math.floor(prompt.length / 4); // rough approximation
  const outputTokens = Math.floor(Math.random() * 500) + 100;
  
  const responseText = "Simulated response from " + model;

  // 3. LOGGING & COST CALCULATION
  const totalTokens = inputTokens + outputTokens;
  const cost = calculateCost(model, inputTokens, outputTokens);

  await prisma.spendLog.create({
    data: {
      agent_id,
      model,
      provider,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      tokens_total: totalTokens,
      cost,
      task_id: task_id || null,
      project_id: project_id || null
    }
  });

  return {
    text: responseText,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      cost
    }
  };
}
