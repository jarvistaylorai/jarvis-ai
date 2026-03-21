"use client";

import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export function WeekView({ routines, onClickRoutine }: any) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDay = new Date().getDay();

  return (
    <div className="h-full flex flex-col pt-4">
      <div className="grid grid-cols-7 gap-4 h-full">
        {days.map((day, idx) => (
          <div key={day} className={`flex flex-col h-full rounded-xl p-3 border transition-colors ${idx === currentDay ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-neutral-900/30 border-neutral-800/50'}`}>
            <h3 className={`text-sm mb-4 font-medium ${idx === currentDay ? 'text-indigo-400' : 'text-neutral-500'}`}>
              {day}
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
              {routines.map((r: any) => (
                <div 
                  key={r.id + idx} 
                  onClick={() => onClickRoutine(r)}
                  className={`
                    p-3 rounded-lg border border-neutral-800/60 bg-neutral-900/80 hover:bg-neutral-800 transition-all cursor-pointer group hover:border-neutral-700 hover:shadow-lg hover:scale-[1.02]
                    ${r.status === 'running' ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.15)] animate-pulse' : ''}
                    ${r.status === 'failing' ? 'border-red-500/40' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-neutral-200 group-hover:text-white line-clamp-1">{r.name}</span>
                    {r.status === "failing" && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    {r.status === "running" && <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-spin-slow" />}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                    {r.schedule_type === 'cron' ? r.cron_expression : `Every ${r.interval_seconds}s`}
                  </div>
                  {idx === currentDay && (
                    <div className="mt-3 flex items-center justify-between text-[11px] border-t border-neutral-800/80 pt-2 text-neutral-400">
                      <span>{r.runs_today || 0} runs today</span>
                      <span className={r.computed_success_rate < 100 ? "text-amber-400" : "text-green-500"}>
                        {r.computed_success_rate}% OK
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
