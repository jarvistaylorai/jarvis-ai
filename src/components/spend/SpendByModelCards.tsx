import Image from 'next/image';
import React from 'react';

export const SpendByModelCards = ({ modelData }: { modelData: unknown[] }) => {
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
              <div className="flex items-center gap-3">
                <Image src="/logos/openai.svg" alt="OpenAI" className="h-6 brightness-0 invert opacity-90 object-contain" width={100} height={100} unoptimized />
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded">{model.name || model.model_name}</h4>
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
        
        <div className="border border-white/5 bg-[#0a0a0b] p-5 rounded-xl flex flex-col justify-between hover:border-white/10 transition-colors opacity-60">
          <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-3">
               <Image src="/logos/gemini.svg" alt="Gemini" className="h-5 brightness-0 invert opacity-90 object-contain" width={100} height={100} unoptimized />
             </div>
          </div>
          <div className="flex justify-between items-end mb-2 pt-6">
             <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">Not <br/>Synced Yet</span>
          </div>
        </div>
        
        {(!modelData || modelData.length === 0) && (
           <div className="col-span-3 py-8 text-center text-zinc-500 text-sm italic border border-dashed border-white/10 rounded-xl">
              No model spend data available yet.
           </div>
        )}
      </div>
    </div>
  );
};
