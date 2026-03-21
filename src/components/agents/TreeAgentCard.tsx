"use client";

import { Agent } from "@/types/agent";
import { Activity, Clock, Cpu, Award } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

export function TreeAgentCard({ agent, type = 'department' }: { agent: Agent, type?: 'founder' | 'core' | 'department' }) {
  const isActive = agent.status === "active";
  
  // Style configurations based on node type to match the vibe
  const styles = {
    founder: {
      wrapper: "from-amber-600/30 via-orange-500/10 to-amber-600/30",
      border: "border-amber-500/40",
      bg: "bg-[#110e08]",
      tag: "bg-amber-500",
      textTag: "text-amber-400",
      headerBadge: "bg-amber-500 text-black",
      icon: "✌️"
    },
    core: {
      wrapper: "from-fuchsia-600/30 via-purple-500/10 to-fuchsia-600/30",
      border: "border-fuchsia-500/40",
      bg: "bg-[#0f0b13]",
      tag: "bg-fuchsia-500",
      textTag: "text-fuchsia-400",
      headerBadge: "bg-fuchsia-500 text-white",
      icon: "🎖️"
    },
    department: {
      wrapper: "from-blue-600/20 via-indigo-500/10 to-blue-600/20",
      border: "border-indigo-500/30",
      bg: "bg-[#0b0c10]",
      tag: "bg-indigo-500",
      textTag: "text-indigo-400",
      headerBadge: "bg-transparent text-zinc-400 border border-zinc-700/50",
      icon: "⚙️"
    }
  };

  const st = styles[type];
  const timeAgo = isActive ? 'now' : (agent.last_active_at ? formatDistanceToNow(new Date(agent.last_active_at), { addSuffix: true }) : 'unknown');

  // Specific overrides for specific agents based on user screenshot
  let displayIcon = st.icon;
  if(agent.name.includes("Nexus") || agent.role.includes("Engineering")) displayIcon = "💻";
  if(agent.name.includes("Ivy") || agent.role.includes("Research")) displayIcon = "🔬";
  if(agent.name.includes("Knox") || agent.role.includes("Security")) displayIcon = "🛡️";
  if(agent.name.includes("Mr. X") || agent.role.includes("Content")) displayIcon = "📣";
  if(agent.name.includes("Wolf") || agent.role.includes("Finance")) displayIcon = "🐺";
  if(agent.name.includes("Ragnar") || agent.role.includes("Events")) displayIcon = "⚔️";

  return (
    <div className="relative w-full group transition-all duration-300 transform hover:-translate-y-1">
      {/* Primary Glow */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${st.wrapper} rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-500`}></div>
      
      <div className={`relative flex flex-col h-full p-5 ${st.bg} ${st.border} border rounded-2xl shadow-xl z-10`}>
        {/* Top Header Badge (Role/Department name) */}
        <div className="flex justify-center -mt-8 mb-4">
           <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg border border-white/5 backdrop-blur-md ${st.headerBadge}`}>
             {agent.role}
           </span>
        </div>

        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
             <div className="text-2xl drop-shadow-md bg-white/5 w-10 h-10 flex items-center justify-center rounded-xl border border-white/10">{displayIcon}</div>
             <div>
               <h3 className="text-lg font-bold text-white tracking-tight">{agent.name}</h3>
               {agent.description && <p className="text-xs text-zinc-400 mt-0.5">{agent.description}</p>}
             </div>
          </div>
          <div className="flex gap-2 items-center">
             {type === 'department' && (
                <div className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 rounded-md text-[9px] font-bold text-indigo-400 flex items-center gap-1 uppercase">
                  {agent.capabilities.length} Active
                </div>
             )}
          </div>
        </div>

        {/* Status / Activity Row */}
        <div className="flex items-center justify-between text-[10px] font-medium tracking-wide bg-black/40 px-3 py-2 rounded-lg border border-white/5 mb-4">
           <div className="flex items-center gap-1.5 opacity-80">
             <Clock size={12} className="text-zinc-500" />
             <span className="text-zinc-400">{timeAgo}</span>
           </div>
           
           <div className="flex items-center gap-1.5 uppercase font-bold tracking-widest">
             <span className="relative flex h-1.5 w-1.5">
               {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
               <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
             </span>
             <span className={isActive ? 'text-emerald-400' : 'text-zinc-500'}>{agent.status}</span>
           </div>
        </div>

        {/* Capabilities List - especially for departments */}
        {type === 'department' && (
          <div className="mt-2 flex-1 relative">
            <h4 className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-2">Capabilities</h4>
            <ul className="space-y-1.5 h-32 overflow-y-auto pr-1 subtle-scroll">
              {agent.capabilities.map((cap, i) => (
                <li key={i} className="flex flex-col gap-0.5 group/item">
                  <div className="flex items-start gap-2 text-xs text-zinc-300">
                    <span className="text-emerald-500/70 mt-[2px]">☑</span>
                    <span className="leading-tight group-hover/item:text-white transition-colors">{cap}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
