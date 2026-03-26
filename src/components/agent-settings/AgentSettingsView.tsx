'use client';

import React, { useState, useEffect } from 'react';
import { GlobalStatsBar } from './GlobalStatsBar';
import { ModelFleet } from './ModelFleet';
import { AgentRuntimeConfig } from './AgentRuntimeConfig';
import { ModelRoutingRules } from './ModelRoutingRules';
import { ActiveSessions } from './ActiveSessions';
import { ProviderSettings } from './ProviderSettings';
import { CostControls } from './CostControls';
import { Agent } from '@contracts';

export const AgentSettingsView = ({ agents = [], activeWorkspace = 'business' }: { agents?: unknown[], activeWorkspace?: string }) => {
  const [models, setModels] = useState<unknown[]>([]);
  const [usageStats, setUsageStats] = useState<unknown>(null);
  const [routingRules, setRoutingRules] = useState<unknown[]>([]);
  const [providers, setProviders] = useState<unknown[]>([]);
  const [agentConfigs, setAgentConfigs] = useState<unknown[]>([]);
  
  const refreshData = async () => {
    try {
      const [modRes, usgRes, routRes, provRes, confRes] = await Promise.all([
        fetch('/api/models'),
        fetch('/api/models/usage'),
        fetch('/api/models/routing'),
        fetch('/api/models/providers'),
        fetch('/api/agents/configs')
      ]);
      const mdls = await modRes.json();
      setModels(Array.isArray(mdls) ? mdls : []);
      
      setUsageStats(await usgRes.json());
      
      const rRules = await routRes.json();
      setRoutingRules(Array.isArray(rRules) ? rRules : []);
      
      const provs = await provRes.json();
      setProviders(Array.isArray(provs) ? provs : []);
      
      const cfgs = await confRes.json();
      setAgentConfigs(Array.isArray(cfgs) ? cfgs : []);
    } catch(e) {}
  };

  useEffect(() => {
    Promise.resolve().then(() => refreshData());
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-20 fade-in animate-in duration-500">
      <div className="flex justify-between items-end border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-light text-white tracking-tight">Agent Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">Model orchestration, execution control, and cost monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/5 transition-colors uppercase tracking-widest">+ Add Model</button>
          <button className="px-4 py-2 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/5 transition-colors uppercase tracking-widest">Sync Providers</button>
          <button className="px-4 py-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 rounded-lg text-xs font-bold transition-colors uppercase tracking-widest">Global Settings</button>
        </div>
      </div>

      <GlobalStatsBar stats={usageStats?.global_stats} />
      
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 flex flex-col gap-8">
          <ModelFleet models={models} onUpdate={refreshData} />
          <AgentRuntimeConfig configs={agentConfigs} models={models} onUpdate={refreshData} />
          <ActiveSessions sessions={usageStats?.recent_sessions || []} onUpdate={refreshData} />
        </div>
        
        <div className="col-span-4 flex flex-col gap-8">
          <ProviderSettings providers={providers} onUpdate={refreshData} />
          <ModelRoutingRules rules={routingRules} models={models} onUpdate={refreshData} />
          <CostControls />
        </div>
      </div>
    </div>
  );
};
