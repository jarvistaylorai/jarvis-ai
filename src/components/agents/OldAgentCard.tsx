"use client";

import React from 'react';
import { Activity, Terminal } from 'lucide-react';
import { Agent } from '@/types/agent';

const Card = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <div className={`bg-[#0f0f11] border border-white/[0.04] rounded-2xl shadow-2xl p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, colorClass }: { children?: React.ReactNode; colorClass?: string }) => (
  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md ${colorClass}`}>
    {children}
  </span>
);

export function OldAgentCard({ agent }: { agent: Agent }) {
  const isActive = agent.status === 'active';
  
  const handleToggleExecution = async () => {
    try {
      const endpoint = isActive ? '/api/agents/stop' : '/api/agents/start';
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id })
      });
      // A full page refresh or letting the polling catch it is fine
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card className="relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
      {isActive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white border border-white/10 shadow-inner ${
            isActive 
              ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border-emerald-500/30' 
              : 'bg-gradient-to-br from-zinc-800 to-black'
          }`}>
            {agent.name.substring(0, 2).toUpperCase()}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0f0f11] flex hidden ${isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse hidden' : 'bg-zinc-600 hidden'}`}></div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0f0f11] ${isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-zinc-600'}`}></div>
        </div>
        <Badge colorClass={isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}>
          {agent.status}
        </Badge>
      </div>

      <div className="mb-4">
        <h3 className="text-xl font-medium text-zinc-100 mb-1">{agent.name}</h3>
        <p className="text-xs text-zinc-500 font-mono tracking-wider">{agent.role}</p>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-black/40 rounded-lg p-3 border border-white/5">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Terminal size={10} /> Active Sequence
          </div>
          <div className="text-xs text-zinc-300 font-mono truncate">
            {agent.current_task || 'Awaiting instructions...'}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 flex items-center gap-1.5"><Activity size={12} /> Compute Load</span>
          <span className="text-zinc-300 font-mono">
            {isActive ? '74%' : '0%'}
          </span>
        </div>
        
        <div className="w-full bg-black h-1 rounded-full overflow-hidden">
          <div className={`h-full ${isActive ? 'bg-emerald-500 w-[74%]' : 'bg-zinc-700 w-0'}`}></div>
        </div>
        
        <div className="flex items-center justify-between mt-3 px-3 py-2 bg-indigo-500/[0.03] border border-indigo-500/10 rounded-lg cursor-pointer hover:bg-indigo-500/[0.08] transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Memory Context</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-1.5 rounded font-mono">Log</span>
        </div>
      </div>

      <button onClick={handleToggleExecution} className={`w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border ${
        isActive 
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
          : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
      }`}>
        {isActive ? 'Halt Execution' : 'Initialize'}
      </button>
    </Card>
  );
}
