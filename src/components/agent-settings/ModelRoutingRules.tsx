import React from 'react';
import { GitBranch, Plus } from 'lucide-react';

export const ModelRoutingRules = ({ rules, models, onUpdate }: { rules: unknown[], models: unknown[], onUpdate: () => void }) => {
  return (
    <div className="bg-[#0f0f12] border border-white/[0.05] rounded-2xl p-6 shadow-2xl relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <GitBranch size={16} className="text-blue-400" />
            Routing Logic
          </h2>
        </div>
        <button className="text-zinc-400 hover:text-white transition-colors"><Plus size={16}/></button>
      </div>

      <div className="space-y-2">
         {rules.length > 0 ? rules.map((rule, i) => {
            const modelName = models.find(m => m.id === rule.model_id)?.name || rule.model_id;
            return (
               <div key={rule.id || i} className="p-3 rounded-lg border border-white/5 bg-gradient-to-r from-blue-500/[0.02] to-transparent flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-zinc-500 font-mono">IF</span>
                     <span className="text-amber-400 font-mono">task</span>
                     <span className="text-zinc-500 font-mono">==</span>
                     <span className="text-emerald-400 font-mono">"{rule.task_type}"</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                     <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">USE</span>
                     <span className="px-1.5 py-0.5 rounded border border-white/10 bg-black text-[10px] uppercase font-bold tracking-widest text-zinc-300">{modelName}</span>
                  </div>
               </div>
            );
         }) : (
            <div className="p-4 text-center border border-white/5 border-dashed rounded-xl text-xs text-zinc-500">
               No custom routing rules defined.
            </div>
         )}
      </div>
    </div>
  );
};
