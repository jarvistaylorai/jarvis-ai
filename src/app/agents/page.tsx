import { Agent } from "@/types/agent";
import { AgentDashboard } from "@/components/agents/AgentDashboard";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function AgentsOverviewPage() {
  const allAgentsRaw = await prisma.agent.findMany();
  
  const allAgents: Agent[] = allAgentsRaw.map((agent: any) => ({
    ...agent,
    capabilities: JSON.parse(agent.capabilities || '[]'),
    description: agent.description || "",
    last_active_at: agent.last_active_at.toISOString(),
  }));

  return <AgentDashboard agents={allAgents} />;
}
