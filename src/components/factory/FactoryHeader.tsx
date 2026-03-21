"use client";

import React from "react";
import { Activity, Code, ServerCrash, CheckCircle, Clock } from "lucide-react";

interface FactoryHeaderProps {
  shippedToday: number;
  inProgress: number;
  backlog: number;
  blocked: number;
  avgTime: string;
  systemLoad: "NORMAL" | "HIGH" | "OVERLOADED";
  activeAgents: number;
  tasksCompletedToday: number;
}

export const FactoryHeader: React.FC<FactoryHeaderProps> = ({
  shippedToday,
  inProgress,
  backlog,
  blocked,
  avgTime,
  systemLoad,
  activeAgents,
  tasksCompletedToday,
}) => {
  const loadColors = {
    NORMAL: "text-green-400",
    HIGH: "text-orange-400",
    OVERLOADED: "text-red-500",
  };

  return (
    <div className="flex gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
      <div className="flex-shrink-0 bg-slate-900 border border-emerald-500/20 rounded-xl p-4 min-w-[160px] flex items-center shadow-[0_0_15px_rgba(16,185,129,0.05)]">
        <div className="mr-4 text-emerald-500">
          <CheckCircle size={24} />
        </div>
        <div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Shipped Today</div>
          <div className="text-2xl font-bold text-white">{shippedToday}</div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-slate-900 border border-blue-500/20 rounded-xl p-4 min-w-[160px] flex items-center shadow-[0_0_15px_rgba(59,130,246,0.05)]">
        <div className="mr-4 text-blue-500">
          <Activity size={24} />
        </div>
        <div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">In Progress</div>
          <div className="text-2xl font-bold text-white">{inProgress}</div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-slate-900 border border-slate-700 rounded-xl p-4 min-w-[160px] flex items-center">
        <div className="mr-4 text-slate-500">
          <Code size={24} />
        </div>
        <div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Backlog</div>
          <div className="text-2xl font-bold text-white">{backlog}</div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-slate-900 border border-red-500/20 rounded-xl p-4 min-w-[160px] flex items-center shadow-[0_0_15px_rgba(239,68,68,0.05)]">
        <div className="mr-4 text-red-500">
          <ServerCrash size={24} />
        </div>
        <div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Blocked</div>
          <div className="text-2xl font-bold text-white">{blocked}</div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-slate-900 border border-purple-500/20 rounded-xl p-4 min-w-[160px] flex items-center shadow-[0_0_15px_rgba(168,85,247,0.05)]">
        <div className="mr-4 text-purple-500">
          <Clock size={24} />
        </div>
        <div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Avg Pipeline Time</div>
          <div className="text-2xl font-bold text-white">{avgTime}</div>
        </div>
      </div>

      {/* New Requirements from prompt */}
      <div className="flex-shrink-0 bg-slate-900 border border-slate-700/50 rounded-xl p-4 min-w-[160px] flex flex-col justify-center">
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1 flex justify-between">
          <span>SYS LOAD</span>
          <span className={loadColors[systemLoad]}>{systemLoad}</span>
        </div>
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1 flex justify-between">
          <span>AGENTS</span>
          <span className="text-white">{activeAgents}</span>
        </div>
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider flex justify-between">
          <span>THROUGHPUT</span>
          <span className="text-white">{tasksCompletedToday}/d</span>
        </div>
      </div>
    </div>
  );
};
