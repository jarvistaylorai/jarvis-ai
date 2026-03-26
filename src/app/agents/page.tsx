
import { Agent } from "@/types/agent";
import { AgentDashboard } from "@/components/agents/AgentDashboard";
import { PrismaClient } from "@prisma/client";
import { Agent } from '@contracts';

const prisma = new PrismaClient();

type AgentMetadata = {
  description?: string;
  layer?: Agent['layer'];
  load?: Agent['load'];
};

function parseMetadata(raw: unknown): Partial<AgentMetadata> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Partial<AgentMetadata>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Partial<AgentMetadata>;
      }
    } catch (error) {
      console.warn('Failed to parse agent.metadata string', error);
    }
  }
  return {};
}

function deriveLoad(utilization?: number | null, metadataLoad?: Agent['load']): Agent['load'] {
  if (metadataLoad) return metadataLoad;
  if (typeof utilization !== 'number') return 'normal';
  if (utilization >= 75) return 'high';
  if (utilization <= 30) return 'low';
  return 'normal';
}

function deriveLayer(agent: Agent, metadataLayer?: Agent['layer']): Agent['layer'] {
  if (metadataLayer) return metadataLayer;
  if (agent.kind === 'human') return 'founder';
  if (agent.kind === 'service') return 'infrastructure';
  return 'core';
}

function normalizeDescription(agent: Agent, metadata: Partial<AgentMetadata>): string {
  if (typeof metadata.description === 'string' && metadata.description.trim().length > 0) {
    return metadata.description;
  }
  if (typeof agent.description === 'string' && agent.description.trim().length > 0) {
    return agent.description;
  }
  return '';
}

function mapAgent(agent: Agent): Agent {
  const metadata = parseMetadata(agent.metadata);
  const capabilityTags = Array.isArray(agent.capability_tags) ? agent.capability_tags : [];
  const load = deriveLoad(agent.utilization_percent, metadata.load);
  const layer = deriveLayer(agent, metadata.layer);
  const status = agent.status === 'error' ? 'error' : agent.status === 'active' ? 'active' : 'idle';
  const lastHeartbeat = agent.last_heartbeat_at ?? agent.updated_at ?? agent.created_at ?? new Date();

  return {
    id: agent.id,
    name: agent.name,
    kind: agent.kind ?? 'autonomous',
    handle: agent.handle,
    role: agent.role ?? 'Operator',
    description: normalizeDescription(agent, metadata),
    capabilities: capabilityTags,
    status,
    load,
    layer,
    current_task: agent.current_task_id ?? undefined,
    last_active_at: new Date(lastHeartbeat).toISOString(),
  };
}

export default async function AgentsOverviewPage() {
  const allAgentsRaw = await prisma.agents.findMany();
  const allAgents: Agent[] = allAgentsRaw.map(mapAgent);

  return <AgentDashboard agents={allAgents} />;
}
