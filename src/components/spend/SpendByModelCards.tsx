import React from 'react';
import { Cpu } from 'lucide-react';

export const SpendByModelCards = ({ modelData }: { modelData: any[] }) => {
  return (
    <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-light text-white">Spend by Model</h2>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold text-[10px]">Critical Cost Drivers</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {(modelData || []).map((model, i) => (
          <div key={i} className="border border-white/5 bg-[#0a0a0b] p-4 rounded-xl hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-zinc-800 rounded bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5">
                  <Cpu size={14} className="text-indigo-400" />
                </div>
                <div>
                   <h4 className="text-sm font-medium text-white">{model.model_name}</h4>
                   <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{model.provider}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xl font-light text-white">${model.spend?.toFixed(2)}</span>
            </div>
            
            <div className="w-full bg-black h-1 rounded-full overflow-hidden mb-3 border border-white/5">
               <div className="h-full bg-indigo-500" style={{ width: `${Math.max(2, model.usage_percent)}%` }}></div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Tokens</span>
                <span className="text-zinc-300 font-mono">{(model.tokens / 1000).toFixed(1)}k</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Avg Req</span>
                <span className="text-zinc-300 font-mono">${model.avg_cost_request?.toFixed(4)}</span>
              </div>
            </div>
          </div>
        ))}
        
        {(!modelData || modelData.length === 0) && (
           <div className="col-span-3 py-8 text-center text-zinc-500 text-sm italic border border-dashed border-white/10 rounded-xl">
              No model spend data available yet.
           </div>
        )}
      </div>
    </div>
  );
};
