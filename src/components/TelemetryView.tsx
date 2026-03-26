import React, { useRef, useEffect } from 'react';
import { TerminalSquare, Play, Pause, Trash2, Download } from 'lucide-react';

export const TelemetryView = ({ activity = [], activeWorkspace = 'business' }: { activity?: unknown[], activeWorkspace?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activity]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-light text-white tracking-tight flex items-center gap-3">
            <TerminalSquare className="text-rose-400" size={24} />
            System Telemetry
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Real-time observability and streaming logs</p>
        </div>
        
        <div className="flex gap-2 bg-[#0a0a0b] p-1.5 rounded-xl border border-white/[0.05]">
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Resume Stream">
            <Play size={16} />
          </button>
          <button className="p-2 text-rose-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Pause Stream">
            <Pause size={16} />
          </button>
          <div className="w-px h-6 bg-white/10 my-auto mx-1"></div>
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Export Logs">
            <Download size={16} />
          </button>
          <button className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Clear Buffer">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0a0a0b] border border-white/[0.04] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        <div className="h-10 border-b border-white/[0.04] flex items-center px-4 bg-[#0d0d0f] gap-3 shrink-0">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono select-none">
            jarvis_telemetry_stream / tail -f /var/log/system.log
          </div>
        </div>

        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed tracking-wider"
        >
          {activity.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-600 italic">
              Awaiting telemetry streams... // System idle
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d0d0f] z-10 
                                shadow-[0_1px_0_0_rgba(255,255,255,0.04)]
                                text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                <tr>
                  <th className="py-2.5 px-4 font-normal whitespace-nowrap w-[130px]">Date & Time</th>
                  <th className="py-2.5 px-4 font-normal whitespace-nowrap w-[70px] text-center">Level</th>
                  <th className="py-2.5 px-4 font-normal whitespace-nowrap w-[140px]">Origin</th>
                  <th className="py-2.5 px-4 font-normal whitespace-nowrap">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {activity.map((event, index) => {
                  const isError = event.severity === 'critical' || event.status === 'error';
                  const isWarning = event.severity === 'warning' || event.status === 'warning';
                  
                  const timeString = event.created_at || event.timestamp 
                    ? (() => {
                        const d = new Date(event.created_at || event.timestamp);
                        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.toLocaleTimeString([], { hour12: false })}`;
                      })()
                    : '--/-- --:--:--';
                    
                  const levelLabel = isError ? 'ERR' : isWarning ? 'WRN' : 'INF';
                  const levelColor = isError 
                    ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' 
                    : isWarning 
                    ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' 
                    : 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20';
                  
                  const textColor = isError ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-zinc-300';
                  
                  return (
                    <tr key={event.id || index} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-4 text-zinc-500 whitespace-nowrap">
                        {timeString}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${levelColor}`}>
                          {levelLabel}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-zinc-500 whitespace-nowrap truncate max-w-[140px]" title={event.agent_id || 'SYS'}>
                        {event.agent_id || 'SYS'}
                      </td>
                      <td className={`py-2 px-4 break-words ${textColor}`}>
                        {event.message}
                      </td>
                    </tr>
                  );
                })}
                <tr className="animate-pulse">
                  <td className="py-2 px-4 text-zinc-700">--/-- --:--:--</td>
                  <td className="py-2 px-4 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider text-zinc-600 bg-zinc-800/50 border border-white/[0.05]">
                      ...
                    </span>
                  </td>
                  <td className="py-2 px-4 text-zinc-700">SYS</td>
                  <td className="py-2 px-4 p-2">
                    <div className="bg-zinc-800/30 h-3 w-1/3 rounded"></div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
