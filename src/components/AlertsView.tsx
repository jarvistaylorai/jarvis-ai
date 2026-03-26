import React from 'react';
import { Bell, AlertOctagon, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useAlerts } from '@/hooks/useMissionControl';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@contracts';

const Card = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <div className={`bg-[#0f0f11] border border-white/[0.04] rounded-2xl shadow-2xl p-6 ${className}`}>
    {children}
  </div>
);

export const AlertsView = ({ alerts: _a, activeWorkspace = 'business' }: { alerts?: unknown[], activeWorkspace?: string }) => {
  const { data: alertsData, isLoading } = useAlerts(activeWorkspace);
  const alerts = alertsData?.data || _a || [];

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

      {isLoading && <div className="text-zinc-500 text-sm">Loading alerts...</div>}

      <div className="flex flex-col gap-4">
        {(!isLoading && (!alerts || alerts.length === 0)) ? (
          <div className="flex flex-col items-center justify-center p-12 border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
            <CheckCircle size={32} className="text-emerald-500 mb-4 opacity-50" />
            <p className="text-sm text-zinc-400">System operating nominally. No active alerts.</p>
          </div>
        ) : alerts.map((alert: Alert) => {
          const isCritical = alert.severity === 'critical';
          const Icon = isCritical ? AlertOctagon : (alert.severity === 'warning' ? AlertTriangle : Info);
          const colorClass = isCritical ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 
                            (alert.severity === 'warning' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20');
          
          return (
            <Card key={alert.id} className={`p-5 relative overflow-hidden transition-all hover:bg-white/[0.02] border ${isCritical ? 'border-rose-500/30' : 'border-white/[0.05]'}`}>
              {isCritical && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-500 to-rose-600"></div>}
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${colorClass}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-white text-base font-semibold tracking-tight">{alert.type || alert.source_type}</h4>
                    <span className="text-[10px] text-zinc-500 font-mono tracking-wider">{alert.created_at || new Date().toISOString()}</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-3">{alert.message}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest rounded bg-black/40 border border-white/5 ${isCritical ? 'text-rose-400' : 'text-zinc-500'}`}>
                        {alert.severity}
                      </span>
                      <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest rounded bg-black/40 border border-white/5 text-zinc-500">
                        {alert.status || alert.source_type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};