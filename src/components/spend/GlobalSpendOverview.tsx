import React from 'react';

export const GlobalSpendOverview = ({ stats }: { stats: any }) => {
  if (!stats) return <div className="animate-pulse h-32 bg-white/5 rounded-2xl"></div>;

  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-colors group">
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Total Spend (24h)</h3>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-light text-white">${stats.spend_24h?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
      <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-colors group">
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Total Spend (7d)</h3>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-light text-white">${stats.spend_7d?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
      <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-colors group">
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Total Spend (30d)</h3>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-light text-white">${stats.spend_30d?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
      <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-colors group">
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Blended Cost / 1K Tokens</h3>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-light text-white">${stats.cost_per_1k?.toFixed(4) || '0.00'}</span>
          <span className="text-xs text-zinc-500 mb-1">{stats.total_tokens?.toLocaleString() || 0} tokens total</span>
        </div>
      </div>
    </div>
  );
};
