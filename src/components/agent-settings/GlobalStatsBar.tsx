import React from 'react';
import { Activity, Zap, Server, ShieldCheck, Database, DollarSign, BrainCircuit, AlertTriangle } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, subtext, colorClass }: any) => (
  <div className={`p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] flex items-center gap-4 ${colorClass}`}>
    <div className={`p-3 rounded-xl border bg-current/10 border-current/20 text-current shadow-[inset_0_1px_rgba(255,255,255,0.1)]`}>
      <Icon size={18} />
    </div>
    <div>
      <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">{label}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-light text-white tracking-tight">{value}</span>
        {subtext && <span className="text-xs text-zinc-500">{subtext}</span>}
      </div>
    </div>
  </div>
);

export const GlobalStatsBar = ({ stats }: { stats: Record<string, any> }) => {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard icon={Server} label="Active Agents" value={stats?.active_agents || 0} subtext="global fleet" colorClass="text-indigo-400" />
      <StatCard icon={Activity} label="Total Sessions (24h)" value={stats?.total_sessions || 0} subtext="requests" colorClass="text-emerald-400" />
      <StatCard icon={Database} label="Tokens Used (24h)" value={(stats?.tokens_used_24h || 0).toLocaleString()} subtext="tokens" colorClass="text-amber-400" />
      <StatCard icon={DollarSign} label="Total Cost (24h)" value={`$${(stats?.total_cost_24h || 0).toFixed(4)}`} subtext="spend" colorClass="text-rose-400" />
      
      <StatCard icon={Zap} label="Avg Cost / Task" value={`$${(stats?.avg_cost_per_task || 0).toFixed(4)}`} colorClass="text-zinc-400" />
      <StatCard icon={BrainCircuit} label="Avg Tokens / Agent" value={Math.round(stats?.avg_tokens_per_agent || 0).toLocaleString()} colorClass="text-zinc-400" />
      <StatCard icon={AlertTriangle} label="Failures / Errors" value={stats?.failures || 0} colorClass={stats?.failures > 0 ? "text-rose-500" : "text-emerald-500"} />
      <StatCard icon={ShieldCheck} label="System Health" value="98%" subtext="routing active" colorClass="text-emerald-500" />
    </div>
  );
};
