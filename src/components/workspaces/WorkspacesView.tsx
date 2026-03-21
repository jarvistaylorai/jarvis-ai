import React, { useEffect, useState, memo } from 'react';
import { AgentWorkspaceClient } from './AgentWorkspaceClient';

export const WorkspacesView = memo(({ activeWorkspace = 'business' }: { activeWorkspace?: string }) => {
  const [agents, setAgents] = useState<string[]>([]);
  const [currentAgentId, setCurrentAgentId] = useState('jarvis');

  useEffect(() => {
    fetch('/api/workspaces')
      .then(res => res.json())
      .then(data => {
        if (data.agents && data.agents.length > 0) {
          setAgents(data.agents);
        } else {
          setAgents(['jarvis']);
        }
      })
      .catch(err => console.error('Failed to load workspaces:', err));
  }, []);

  return <AgentWorkspaceClient agents={agents} currentAgentId={currentAgentId} onAgentSelect={setCurrentAgentId} />;
});
