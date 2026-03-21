import React from 'react';
import { Target } from 'lucide-react';

export const SpendByAgentTable = ({ agentData }: { agentData: any[] }) => {
  return (
    <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-light text-white">Spend by Agent</h2>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold text-[10px]">Execution Efficiency</p>
      </div>
      
      <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Agent</th>
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Spend</th>
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Tokens</th>
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Avg Cost</th>
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {(agentData || []).map((agent, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group">
                <td className="py-3 items-center gap-2">
                  <div className="font-medium text-white text-sm">{agent.agent_name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">ID: {agent.agent_id}</div>
                </td>
                <td className="py-3 text-sm text-zinc-300 font-mono">${agent.spend?.toFixed(2)}</td>
                <td className="py-3 text-sm text-zinc-400 font-mono">{(agent.tokens / 1000).toFixed(1)}k</td>
                <td className="py-3 text-sm text-zinc-400 font-mono">${agent.avg_cost?.toFixed(3)}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full ${agent.efficiency_score > 80 ? 'bg-emerald-500' : agent.efficiency_score > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${agent.efficiency_score}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-zinc-300">{Math.round(agent.efficiency_score)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {(!agentData || agentData.length === 0) && (
          <div className="py-8 text-center text-zinc-500 text-sm italic">
            No agent spend data available yet.
          </div>
        )}
      </div>
    </div>
  );
};
