import React from 'react';
import { Layers, ArrowRight } from 'lucide-react';

export const AgentRuntimeConfig = ({ configs, models, onUpdate }: { configs: any[], models: any[], onUpdate: () => void }) => {
  return (
    <div className="bg-[#0f0f12] border border-white/[0.05] rounded-2xl p-6 shadow-2xl relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Layers size={16} className="text-purple-400" />
            Agent Runtime Configuration
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Map agents to primary and fallback models</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {configs.map((agent: any) => {
           const config = agent.agent_model_config || {};
           const primary = config.primary_model?.name || 'Unassigned';
           const fallback = config.fallback_model?.name || 'None';
           
           return (
             <div key={agent.id} className="p-4 rounded-xl border border-white/[0.05] bg-black/40 hover:bg-white/[0.02] transition-colors group">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-sm font-bold text-white tracking-wide">{agent.name}</h3>
                   <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-widest ${agent.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                      {agent.status}
                   </span>
                </div>

                <div className="space-y-3 mb-4">
                   <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Primary</div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs text-zinc-300 font-medium">{primary}</span>
                         <ArrowRight size={12} className="text-zinc-600" />
                      </div>
                   </div>
                   <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/[0.02] border border-orange-500/10">
                      <div className="text-[10px] text-orange-500/50 uppercase font-bold tracking-widest">Fallback</div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs text-orange-400/80 font-medium">{fallback}</span>
                      </div>
                   </div>
                </div>

                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                   <div className="flex gap-3">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                         Mode: <span className="text-zinc-300">{config.mode || 'Balanced'}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                         Limit: <span className="text-zinc-300">${config.max_cost || '5.0'}</span>
                      </div>
                   </div>
                   <button className="text-[10px] text-indigo-400 hover:text-indigo-300 uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      Configure
                   </button>
                </div>
             </div>
           );
        })}
        {configs.length === 0 && (
           <div className="col-span-2 text-center py-8 text-zinc-500 text-sm border border-white/5 border-dashed rounded-xl">No configurations found.</div>
        )}
      </div>
    </div>
  );
};
