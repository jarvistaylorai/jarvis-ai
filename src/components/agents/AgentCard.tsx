"use client";

import { Agent } from "@/types/agent";
import { Activity, ChevronRight } from "lucide-react";

export function AgentCard({ agent }: { agent: Agent }) {
  const isActive = agent.status === "active";
  
  return (
    <div className="relative group p-5 bg-[#121212] border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all duration-200 ease-out hover:-translate-y-1">
      {/* Soft Glow */}
      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl blur-xl" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-medium text-zinc-100">{agent.name}</h3>
            <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase mt-0.5">{agent.role}</p>
          </div>
          <div className="flex items-center">
            <span className="relative flex h-2 w-2">
              {isActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
            </span>
          </div>
        </div>
        
        <p className="text-sm text-zinc-400 mb-6 line-clamp-2 min-h-[40px] leading-relaxed">{agent.description}</p>
        
        <div className="mt-auto">
          <div className="flex flex-wrap gap-1.5 mb-5">
            {agent.capabilities.map((cap) => (
              <span key={cap} className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 rounded">
                {cap}
              </span>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
            <button className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center group/btn uppercase tracking-wider">
              Role Card 
            </button>
            {isActive && (
               <span className="text-[11px] font-medium text-emerald-500/80 flex items-center uppercase tracking-wider">
                 Active
               </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
