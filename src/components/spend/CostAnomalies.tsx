import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const CostAnomalies = ({ anomalies }: { anomalies: any[] }) => {
  if (!anomalies) return <div className="h-64 border border-white/[0.04] rounded-2xl bg-[#0f0f11] animate-pulse"></div>;

  return (
    <div className="bg-[#0f0f11] border border-rose-500/20 p-6 rounded-2xl bg-rose-500/[0.02]">
      <div className="mb-4">
        <h2 className="text-lg font-light text-rose-400 capitalize flex items-center gap-2">
          <AlertTriangle size={18} /> Cost Anomalies
        </h2>
        <p className="text-xs text-rose-500/70 mt-1 uppercase tracking-widest font-semibold text-[10px]">Real-time alerting</p>
      </div>

      <div className="flex flex-col gap-3">
        {anomalies.map(anomaly => (
          <div key={anomaly.id} className="flex gap-3 text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl items-start group hover:bg-rose-500/20 transition-colors cursor-pointer">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 animate-pulse" />
            <span className="text-sm font-medium">{anomaly.message}</span>
          </div>
        ))}
        {anomalies.length === 0 && (
           <div className="text-xs text-zinc-500 italic p-3 border border-white/5 border-dashed rounded-xl">No anomalies detected.</div>
        )}
      </div>
    </div>
  );
};
