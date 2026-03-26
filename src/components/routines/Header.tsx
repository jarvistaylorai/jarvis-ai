"use client";

import { Activity, Plus, RefreshCcw } from "lucide-react";

export function Header({ routines, view, setView, onNew }: { routines: unknown[], view: string, setView: unknown, onNew: unknown }) {
  // Compute total running or failing to show in signal
  const activeExesCount = routines.reduce((acc: number, r: unknown) => acc + (r.status === "running" ? 1 : 0), 0);
  const isOverloaded = activeExesCount > 5;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-1 flex items-center gap-3">
            Autonomous Routines
          </h1>
          <p className="text-neutral-400 text-sm">System-level execution schedules and agent automation</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${isOverloaded ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            <Activity className="w-3.5 h-3.5" />
            SYS: {isOverloaded ? "OVERLOADED" : "NORMAL"}
          </div>

          <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
            <button 
              onClick={() => setView("Week")}
              className={`px-4 py-1.5 rounded-md text-sm transition-all ${view === "Week" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-white"}`}
            >
              Week
            </button>
            <button 
              onClick={() => setView("Today")}
              className={`px-4 py-1.5 rounded-md text-sm transition-all ${view === "Today" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-white"}`}
            >
              Today
            </button>
          </div>
          
           <button 
              className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 cursor-pointer"
            >
              <RefreshCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={onNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Routine
          </button>
        </div>
      </div>

      {/* TOP BAR - ALWAYS RUNNING */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center gap-3 text-neutral-400 text-xs font-medium uppercase tracking-wider mb-3">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span>Always Running</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {routines.map((r: Record<string, unknown>) => (
            <div 
              key={r.id} 
              className="flex items-center gap-3 bg-neutral-950/50 border border-neutral-800 rounded-lg px-4 py-2 hover:border-neutral-700 transition-colors cursor-pointer group"
            >
              <div>
                <div className="text-sm font-medium text-neutral-200 group-hover:text-white">{r.name}</div>
                <div className="text-xs text-neutral-500">
                  {r.schedule_type === "cron" ? "CRON" : `Every ${r.interval_seconds}s`} • 
                  <span className={`ml-1 ${r.status !== 'healthy' ? (r.status === 'paused' ? 'text-neutral-600' : 'text-red-400') : 'text-green-500'}`}>
                    {r.status === 'healthy' ? '🟢 Healthy' : (r.status === 'paused' ? '⚪ Paused' : '🔴 Failing')}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {routines.length === 0 && (
            <div className="text-sm text-neutral-600">No routines scheduled.</div>
          )}
        </div>
      </div>
    </div>
  );
}
