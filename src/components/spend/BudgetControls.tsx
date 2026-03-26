import React, { useState, useEffect } from 'react';

export const BudgetControls = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetch('/api/spend/budget').then(r => r.json()).then(setConfig);
  }, []);
  
  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch('/api/spend/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      // Optionally show success message
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setConfig({ ...config, [field]: parseFloat(value) || 0 });
  };

  if (!config) return <div className="h-64 border border-white/[0.04] rounded-2xl bg-[#0f0f11] animate-pulse"></div>;

  return (
    <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-light text-white">Budget Controls</h2>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold text-[10px]">Execution Limits</p>
        </div>
        <button 
           onClick={handleSave} 
           disabled={loading}
           className="px-4 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Config'}
        </button>
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
           <div className="pl-3">
              <div className="text-sm font-medium text-white flex items-center gap-2">Monthly Soft Limit <span className="bg-indigo-500/20 text-indigo-400 text-[9px] px-1.5 rounded uppercase tracking-widest font-bold">Sync</span></div>
              <div className="text-xs text-zinc-500 mt-0.5">Trigger alerts when month-to-date approaches target</div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-mono">$</span>
              <input type="number" value={config.monthly_budget_limit || 35} onChange={(e) => updateField('monthly_budget_limit', e.target.value)} className="w-24 bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-3 py-1.5 text-white font-mono text-right focus:outline-none focus:border-indigo-400" />
           </div>
        </div>
        <div className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
           <div>
              <div className="text-sm font-medium text-white">Global Daily Budget</div>
              <div className="text-xs text-zinc-500 mt-0.5">Maximum system spend per day</div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-mono">$</span>
              <input type="number" value={config.global_daily_limit} onChange={(e) => updateField('global_daily_limit', e.target.value)} className="w-24 bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono text-right focus:outline-none focus:border-indigo-500" />
           </div>
        </div>
        <div className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
           <div>
              <div className="text-sm font-medium text-white">Per-Agent Limit</div>
              <div className="text-xs text-zinc-500 mt-0.5">Max daily allowed per agent</div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-mono">$</span>
              <input type="number" value={config.per_agent_limit} onChange={(e) => updateField('per_agent_limit', e.target.value)} className="w-24 bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono text-right focus:outline-none focus:border-indigo-500" />
           </div>
        </div>
        <div className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
           <div>
              <div className="text-sm font-medium text-white">Per-Task Limit</div>
              <div className="text-xs text-zinc-500 mt-0.5">Max allowed cost per task execution</div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-mono">$</span>
              <input type="number" value={config.per_task_limit} onChange={(e) => updateField('per_task_limit', e.target.value)} className="w-24 bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono text-right focus:outline-none focus:border-indigo-500" />
           </div>
        </div>
        <div className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
           <div>
              <div className="text-sm font-medium text-white">Per-Model Limit</div>
              <div className="text-xs text-zinc-500 mt-0.5">Max daily cost allowed per model provider</div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-mono">$</span>
              <input type="number" value={config.per_model_limit} onChange={(e) => updateField('per_model_limit', e.target.value)} className="w-24 bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono text-right focus:outline-none focus:border-indigo-500" />
           </div>
        </div>
      </div>
    </div>
  );
};
