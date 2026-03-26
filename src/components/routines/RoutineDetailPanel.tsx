"use client";

import { useEffect, useState } from "react";
import { X, Play, Pause, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { ExecutionDetailModal } from "./ExecutionDetailModal";

export function RoutineDetailPanel({ routine, onClose, onRefresh }: { routine: unknown, onClose: unknown, onRefresh: unknown }) {
  const [executions, setExecutions] = useState<unknown[]>([]);
  const [loadingExecs, setLoadingExecs] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<any | null>(null);

  const fetchExecutions = async () => {
    try {
      const res = await fetch(`/api/routines/${routine.id}/executions`);
      if (res.ok) {
        setExecutions(await res.json());
      }
    } finally {
      setLoadingExecs(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
    const iv = setInterval(fetchExecutions, 3000);
    return () => clearInterval(iv);
  }, [routine.id, fetchExecutions]);

  const handleRun = async () => {
    setIsRunning(true);
    await fetch(`/api/routines/${routine.id}/run`, { method: "POST" });
    setIsRunning(false);
    onRefresh();
  };

  const handleTogglePause = async () => {
    await fetch(`/api/routines/${routine.id}`, {
      method: "PATCH",
      body: JSON.stringify({ 
        enabled: !routine.enabled, 
        status: !routine.enabled ? "healthy" : "paused" 
      }),
    });
    onRefresh();
  };

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-96 bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col transform transition-transform animate-slide-in-right z-40">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white truncate pr-4">{routine.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Info */}
          <section>
            <div className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-3">Info</div>
            <p className="text-sm text-neutral-300 mb-4">{routine.description || "No description provided."}</p>
            <div className="bg-neutral-950 rounded-lg border border-neutral-800 p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Agent</span><span className="text-white capitalize">{routine.agent_id}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Schedule</span><span className="text-white bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-xs">{routine.schedule_type === 'cron' ? routine.cron_expression : `Every ${routine.interval_seconds}s`}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Status</span>
                <span className={`capitalize ${routine.status === 'healthy' ? 'text-green-500' : (routine.status === 'paused' ? 'text-neutral-500' : 'text-red-500')}`}>
                  {routine.status}
                </span>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section>
            <div className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-3">Stats (Today)</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <div className="text-xs text-neutral-500 mb-1">Success Rate</div>
                <div className="text-xl text-white font-medium">{routine.computed_success_rate || 100}%</div>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <div className="text-xs text-neutral-500 mb-1">Runs Today</div>
                <div className="text-xl text-white font-medium">{routine.runs_today || 0}</div>
              </div>
            </div>
          </section>

          {/* Controls */}
          <section>
            <div className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-3">Controls</div>
            <div className="flex gap-3">
              <button 
                onClick={handleRun}
                disabled={isRunning}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1" />} 
                {isRunning ? "Running..." : "Run Now"}
              </button>
              <button 
                onClick={handleTogglePause}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {routine.enabled ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Enable</>}
              </button>
            </div>
          </section>

          {/* History */}
          <section>
            <div className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-3">Recent Executions</div>
            {loadingExecs ? (
              <div className="text-sm text-neutral-500 text-center py-4">Loading executions...</div>
            ) : executions.length === 0 ? (
               <div className="text-sm text-neutral-500 text-center py-4 bg-neutral-950 border border-neutral-800 rounded-lg">No executions yet.</div>
            ) : (
              <div className="space-y-2">
                {executions.reverse().slice(0, 10).map((ex: Record<string, unknown>) => (
                  <div 
                    key={ex.id} 
                    onClick={() => setSelectedExecution(ex)}
                    className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {ex.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                       ex.status === 'failed' ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                       <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                      <div>
                        <div className="text-sm text-white capitalize">{ex.status}</div>
                        <div className="text-xs text-neutral-500">
                          {new Date(ex.started_at).toLocaleString([], {month:'short', day:'numeric', hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      {selectedExecution && (
        <ExecutionDetailModal 
          execution={selectedExecution} 
          routine={routine} 
          onClose={() => setSelectedExecution(null)} 
        />
      )}
    </>
  );
}
