"use client";

import { X, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export function ExecutionDetailModal({ execution, routine, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-3">
            {execution.status === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
             execution.status === 'failed' ? <AlertTriangle className="w-5 h-5 text-red-500" /> :
             <Clock className="w-5 h-5 text-indigo-500" />}
            <h2 className="text-lg font-medium text-white flex gap-2 items-center">
              Execution Details
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800">
              <div className="text-xs text-neutral-500 mb-1">Started At</div>
              <div className="text-sm text-white">{new Date(execution.started_at).toLocaleString()}</div>
            </div>
            <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800">
              <div className="text-xs text-neutral-500 mb-1">Duration</div>
              <div className="text-sm text-white">{execution.duration_ms ? `${(execution.duration_ms / 1000).toFixed(2)}s` : "Running..."}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-neutral-300 mb-2">Output Summary</div>
            <div className={`p-4 rounded-lg bg-neutral-950 border text-sm font-mono break-words whitespace-pre-wrap
              ${execution.status === 'failed' ? 'border-red-500/30 text-red-400' : 'border-neutral-800 text-neutral-300'}
            `}>
              {execution.status === 'failed' ? (
                <>
                  <span className="text-red-500 font-bold">ERROR: </span>
                  {execution.error_message || "Unknown error occurred"}
                </>
              ) : (
                execution.output_summary || "No output provided."
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-800">
             <button onClick={onClose} className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
