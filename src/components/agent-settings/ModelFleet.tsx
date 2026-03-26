import React from 'react';
import { Cpu, Settings2 } from 'lucide-react';

export const ModelFleet = ({ models, onUpdate }: { models: unknown[], onUpdate: () => void }) => {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
      case 'fallback': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'disabled': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-white/10';
    }
  };

  return (
    <div className="bg-[#0f0f12] border border-white/[0.05] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 opacity-20"></div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Cpu size={16} className="text-indigo-400" />
            Model Fleet
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Available LLMs and their performance</p>
        </div>
        <button className="text-[10px] text-zinc-400 hover:text-white uppercase font-bold tracking-widest"><Settings2 size={14}/></button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {models.map((model) => (
          <div key={model.id} className="p-4 rounded-xl border border-white/[0.05] bg-black/40 hover:bg-white/[0.02] transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">{model.name}</h3>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{model.provider}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest border ${getStatusColor(model.status)}`}>
                {model.status}
              </span>
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              {model.capabilities?.map((cap: string) => (
                <span key={cap} className="px-1.5 py-0.5 rounded border border-white/10 text-[9px] text-zinc-400 uppercase tracking-wider bg-white/5">
                  {cap}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/[0.05] mb-4">
               <div>
                  <div className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest mb-1">Tokens</div>
                  <div className="text-xs text-zinc-300 font-mono">{(model.usage?.tokens || 0).toLocaleString()}</div>
               </div>
               <div>
                  <div className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest mb-1">Sessions</div>
                  <div className="text-xs text-zinc-300 font-mono">{model.usage?.sessions || 0}</div>
               </div>
               <div>
                  <div className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest mb-1">Cost/1K</div>
                  <div className="text-xs text-zinc-300 font-mono">${model.cost_per_1k}</div>
               </div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Agents:</span>
                <span className="text-xs text-zinc-300 font-mono">{model.assigned_agents?.length > 0 ? model.assigned_agents.join(', ') : 'None'}</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                 <button className="text-[9px] text-indigo-400 hover:text-indigo-300 uppercase font-bold tracking-widest">Edit</button>
              </div>
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div className="col-span-2 text-center py-8 text-zinc-500 text-sm border border-white/5 border-dashed rounded-xl">No models configured.</div>
        )}
      </div>
    </div>
  );
};
