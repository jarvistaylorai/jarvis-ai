import React from 'react';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@contracts';

export const CostBreakdownTable = ({ logs }: { logs: unknown[] }) => {
  return (
    <div className="bg-[#0f0f11] border border-white/[0.04] p-6 rounded-2xl h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-light text-white">Cost Breakdown</h2>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold text-[10px]">Raw Execution Logs</p>
      </div>
      
      <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Time</th>
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Agent</th>
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Model</th>
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Tokens</th>
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Cost</th>
              <th className="pb-3 text-[10px] uppercase font-bold tracking-widest text-zinc-600">Task</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).map((log, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors group">
                <td className="py-3 text-[11px] text-zinc-500 font-mono">
                   {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="py-3 items-center gap-2 text-[13px] text-white">
                  {log.agent_name}
                </td>
                <td className="py-3 text-[13px] text-zinc-300">
                  <span className="bg-white/5 px-2 py-1 rounded text-xs">{log.model_name}</span>
                </td>
                <td className="py-3 text-[13px] text-zinc-400 font-mono">
                  {log.tokens.toLocaleString()}
                </td>
                <td className="py-3 text-[13px] text-zinc-400 font-mono">
                  ${log.cost?.toFixed(4)}
                </td>
                <td className="py-3 text-[13px] text-zinc-400 truncate max-w-[150px]">
                  {log.task_name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {(!logs || logs.length === 0) && (
          <div className="py-8 text-center text-zinc-500 text-sm italic border border-dashed border-white/10 rounded-xl mt-4">
            No detailed logs available yet.
          </div>
        )}
      </div>
    </div>
  );
};
