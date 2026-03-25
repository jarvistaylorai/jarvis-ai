import React from 'react';
import { AgentDashboard } from './agents/AgentDashboard';
import { Agent } from '@/types/agent';
import { useAgents } from '@/hooks/useMissionControl';

export const AgentsView = ({ agents: _a, activeWorkspace = 'business' }: { agents?: any[], activeWorkspace?: string }) => {
  const { data: agentsData } = useAgents(activeWorkspace);
  const agents = agentsData?.data || _a || [];

  const formattedAgents: Agent[] = agents.map((agent: any) => ({
    ...agent,
    capabilities: agent.capability_tags || (typeof agent.capabilities === 'string' ? JSON.parse(agent.capabilities || '[]') : (agent.capabilities || [])),
    description: agent.metadata?.description || agent.description || "",
    last_active_at: agent.last_heartbeat_at || agent.last_active_at ? new Date(agent.last_heartbeat_at || agent.last_active_at).toISOString() : new Date().toISOString(),
  }));

  return <AgentDashboard agents={formattedAgents} />;
};