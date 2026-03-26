import React from 'react';
import { Activity, XCircle } from 'lucide-react';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@/types/contracts';

export const ActiveSessions = ({ sessions, onUpdate }: { sessions: unknown[], onUpdate: () => void }) => {
  return (
    <div className="bg-[#0f0f12] border border-white/[0.05] rounded-2xl p-6 shadow-2xl relative">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
             <Activity size={16} className="text-emerald-400" />
             Active Sessions
           </h2>
           <p className="text-xs text-zinc-500 mt-1">Live model execution tracking</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Agent</th>
              <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</th>
              <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Task</th>
              <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tokens</th>
              <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cost</th>
              <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Duration</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sessions.slice(0, 5).map((session, i) => (
               <tr key={session.id || i} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 text-xs text-white font-medium">{session.agent_id || 'System'}</td>
                  <td className="py-3 text-xs text-zinc-400">
                     <span className="px-1.5 py-0.5 rounded border border-white/5 bg-black text-[10px] uppercase font-bold tracking-widest">
                        {session.model?.name || 'Unknown'}
                     </span>
                  </td>
                  <td className="py-3 text-xs text-zinc-300 truncate max-w-[150px]">{session.task || 'Routine task'}</td>
                  <td className="py-3 text-xs text-amber-400/80 font-mono">{session.tokens?.toLocaleString()}</td>
                  <td className="py-3 text-xs text-rose-400/80 font-mono">${session.cost?.toFixed(4)}</td>
                  <td className="py-3 text-xs text-zinc-500 font-mono">{session.duration ? `${session.duration}ms` : 'running...'}</td>
                  <td className="py-3 text-right">
                     <button className="text-zinc-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
                        <XCircle size={14} />
                     </button>
                  </td>
               </tr>
            ))}
            {sessions.length === 0 && (
               <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-zinc-500">No active sessions</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
