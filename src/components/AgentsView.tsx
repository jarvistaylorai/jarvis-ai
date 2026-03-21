import React from 'react';
import { AgentDashboard } from './agents/AgentDashboard';
import { Agent } from '@/types/agent';

export const AgentsView = ({ agents = [], activeWorkspace = 'business' }: { agents?: any[], activeWorkspace?: string }) => {
  const formattedAgents: Agent[] = agents.map((agent: any) => ({
    ...agent,
    capabilities: typeof agent.capabilities === 'string' ? JSON.parse(agent.capabilities || '[]') : (agent.capabilities || []),
    description: agent.description || "",
    last_active_at: agent.last_active_at ? new Date(agent.last_active_at).toISOString() : new Date().toISOString(),
  }));

  return <AgentDashboard agents={formattedAgents} />;
};
