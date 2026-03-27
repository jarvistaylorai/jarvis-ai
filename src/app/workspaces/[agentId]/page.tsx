"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AgentWorkspaceClient } from '@/components/workspaces/AgentWorkspaceClient';

export default function WorkspacePage() {
  const params = useParams();
    const router = useRouter();
  const [agents, setAgents] = useState<string[]>([]);
  const agentId = (params?.agentId as string) || 'clay';

  useEffect(() => {
    fetch('/api/workspaces')
      .then(res => res.json())
      .then(data => {
        if (data.agents && data.agents.length > 0) {
          setAgents(data.agents);
        } else {
          // If no agents are found on the filesystem, we might just default to clay
          setAgents(['clay']);
        }
      })
      .catch(err => console.error('Failed to load workspaces:', err));
  }, []);

  return <AgentWorkspaceClient agents={agents} currentAgentId={agentId} />;
}
