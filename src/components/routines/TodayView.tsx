"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

export function TodayView({ routines, onClickRoutine }: { routines: unknown[], onClickRoutine: any }) {
  const [executions, setExecutions] = useState<any[]>([]);

  useEffect(() => {
    // Fetch recent executions across all routines
    // For today view we ideally want a global timeline. 
    // We can just fetch /api/routines/... wait, we need a global top level /api/executions if we want a global timeline.
    // For now we will mock it based on routines data if we didn't build a global one.
    // Let's just create a quick timeline from the routines themselves.
    const run = async () => {
      // For simplicity, map routines into an imaginary timeline based on last run
      // A Real app would fetch the full execution history sorted by time.
    };
    run();
  }, [routines]);

  return (
    <div className="h-full pt-4 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl h-full p-6 overflow-y-auto">
        <h2 className="text-lg font-medium text-white mb-6">Today's Timeline</h2>
        <div className="relative pl-6 border-l border-neutral-800 space-y-8">
          
          {routines.filter((r: Record<string, any>) => r.last_run_at).sort((a: any, b: any) => new Date(b.last_run_at).getTime() - new Date(a.last_run_at).getTime()).map((r: Record<string, any>) => (
            <div key={r.id} className="relative group cursor-pointer" onClick={() => onClickRoutine(r)}>
              <div className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 border-neutral-900 ${r.status === 'failing' ? 'bg-red-500' : 'bg-green-500'} group-hover:scale-125 transition-transform`} />
              
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 group-hover:border-neutral-700 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-white">{r.name}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {new Date(r.last_run_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                    </p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-md ${r.status === 'failing' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {r.status === 'failing' ? 'Failed' : 'Success'}
                  </div>
                </div>
                {r.status === 'failing' && r.recent_failures?.[0] && (
                  <div className="mt-3 text-xs bg-red-500/5 text-red-400/80 p-2 rounded-lg border border-red-500/10">
                    <AlertCircle className="inline w-3 h-3 mr-1" />
                    {r.recent_failures[0].error_message || "Unknown error"}
                  </div>
                )}
                {r.status === 'running' && (
                  <div className="mt-3 text-xs text-indigo-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running Agent Task...
                  </div>
                )}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
