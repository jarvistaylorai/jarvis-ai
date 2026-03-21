import React from 'react';
import { Bell, AlertOctagon, AlertTriangle, Info, CheckCircle } from 'lucide-react';

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-[#0f0f11] border border-white/[0.04] rounded-2xl shadow-2xl p-6 ${className}`}>
    {children}
  </div>
);

export const AlertsView = ({ alerts = [], activeWorkspace = 'business' }: { alerts?: any[], activeWorkspace?: string }) => {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-light text-white tracking-tight flex items-center gap-3">
            <Bell className="text-rose-400" size={24} />
            System Alerts
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Autonomous bottleneck detection and operational warnings</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {(!alerts || alerts.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-12 border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
            <CheckCircle size={32} className="text-emerald-500 mb-4 opacity-50" />
            <p className="text-sm text-zinc-400">System operating nominally. No active alerts.</p>
          </div>
        ) : alerts.map((alert: any) => {
          const isCritical = alert.severity === 'CRITICAL';
          const isHigh = alert.severity === 'HIGH';
          
          return (
            <Card key={alert.id} className={`p-4 flex items-start gap-4 ${
              isCritical ? 'border-rose-500/30 bg-rose-500/[0.02]' : 
              isHigh ? 'border-amber-500/30 bg-amber-500/[0.02]' : 'border-white/[0.04]'
            }`}>
              <div className="mt-1">
                {isCritical ? <AlertOctagon size={20} className="text-rose-500" /> :
                 isHigh ? <AlertTriangle size={20} className="text-amber-500" /> :
                 <Info size={20} className="text-indigo-400" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`text-sm font-semibold ${isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {alert.type}
                  </h3>
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-zinc-300">{alert.message}</p>
                <div className="flex gap-2 mt-4">
                  <button className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-white transition-colors">
                    Investigate
                  </button>
                  <button className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded bg-transparent hover:bg-white/5 text-zinc-500 transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
