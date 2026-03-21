import React, { useRef, useEffect } from 'react';
import { TerminalSquare, Play, Pause, Trash2, Download } from 'lucide-react';

export const TelemetryView = ({ activity = [], activeWorkspace = 'business' }: { activity?: any[], activeWorkspace?: string }) => {
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
            <div className="flex flex-col gap-1.5 pb-4">
              {activity.map((event, index) => {
                const isError = event.status === 'error';
                const isWarning = event.status === 'warning';
                const isSuccess = event.status === 'success';
                
                return (
                  <div key={event.id || index} className="flex gap-4 group hover:bg-white/[0.02] px-2 py-0.5 rounded transition-colors">
                    <div className="text-zinc-600 shrink-0 w-[60px] select-none text-right">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}
                    </div>
                    <div className={`shrink-0 uppercase font-bold w-[40px] select-none text-center ${
                      isError ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-indigo-400'
                    }`}>
                      {event.status === 'error' ? 'ERR' : event.status === 'warning' ? 'WRN' : 'INF'}
                    </div>
                    <div className="text-zinc-500 shrink-0 w-[60px] truncate select-none">
                      [{event.agent_id || 'SYS'}]
                    </div>
                    <div className={`flex-1 break-words ${
                      isError ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-zinc-300'
                    }`}>
                      {event.message}
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-4 animate-pulse mt-1 px-2">
                <div className="text-zinc-700 w-[60px] text-right">--:--:--</div>
                <div className="text-zinc-700 w-[40px] text-center">...</div>
                <div className="w-2 h-4 bg-zinc-600"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
