import React from 'react';
import { DollarSign } from 'lucide-react';

export const CostControls = () => {
  return (
    <div className="bg-[#0f0f12] border border-white/[0.05] rounded-2xl p-6 shadow-2xl relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <DollarSign size={16} className="text-rose-400" />
            Cost Controls
          </h2>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="p-3 rounded-lg border border-white/5 bg-black/40">
           <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Daily Budget (Global)</label>
           <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">$</div>
              <input type="number" defaultValue={50} className="w-full bg-white/[0.02] border border-white/[0.05] rounded-md py-1.5 pl-7 pr-3 text-sm text-white focus:outline-none focus:border-rose-500/50" />
           </div>
        </div>
        <div className="p-3 rounded-lg border border-white/5 bg-black/40">
           <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Max Task Limit</label>
           <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">$</div>
              <input type="number" defaultValue={2.50} className="w-full bg-white/[0.02] border border-white/[0.05] rounded-md py-1.5 pl-7 pr-3 text-sm text-white focus:outline-none focus:border-rose-500/50" />
           </div>
        </div>
      </div>
    </div>
  );
};
