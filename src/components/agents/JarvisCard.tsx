"use client";

import { Agent } from "@/types/agent";
import { ChevronRight } from "lucide-react";

export function JarvisCard({ agent }: { agent: Agent }) {
  const isActive = agent.status === "active";
  
  return (
    <div className="relative max-w-3xl mx-auto w-full group">
      {/* Primary Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-indigo-500/10 to-blue-600/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition duration-700"></div>
      
      <div className="relative p-8 bg-[#0a0a0c] border border-blue-900/30 rounded-2xl shadow-2xl transition-all duration-300 transform group-hover:scale-[1.01]">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                {/* Outer Ambient Glow */}
                <div className="absolute -inset-2 rounded-full bg-cyan-500/20 blur-xl animate-pulse"></div>
                {/* Outer Ring */}
                <div className="absolute inset-0 rounded-full border border-cyan-500/50 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.4)_inset,0_0_10px_rgba(6,182,212,0.5)]"></div>
                {/* Segmented Spinning Ring */}
                <div className="absolute inset-[3px] rounded-full border-[2.5px] border-dashed border-cyan-400/70 animate-[spin_10s_linear_infinite]"></div>
                {/* Inner Ring */}
                <div className="absolute inset-1.5 rounded-full border border-cyan-300/60 shadow-[0_0_10px_rgba(103,232,249,0.5)_inset]"></div>
                {/* Glowing Core Capacitor */}
                <div className="absolute inset-[11px] rounded-full bg-gradient-to-tr from-cyan-100 to-white shadow-[0_0_20px_rgba(255,255,255,0.9),0_0_35px_rgba(34,211,238,0.8)] flex items-center justify-center overflow-hidden">
                   {/* Bright Center Pulse */}
                   <div className="w-full h-full bg-cyan-300/40 animate-pulse rounded-full"></div>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">{agent.name}</h2>
                <p className="text-blue-400/80 text-sm font-medium uppercase tracking-widest mt-0.5">{agent.role}</p>
              </div>
            </div>
            
            <p className="text-zinc-400 mb-8 text-sm leading-relaxed max-w-xl">{agent.description}</p>
            
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((cap) => (
                <span key={cap} className="px-3 py-1 text-xs font-medium tracking-wide bg-blue-900/20 text-blue-300/90 border border-blue-800/40 rounded shadow-sm">
                  {cap}
                </span>
              ))}
            </div>
          </div>
          
          <div className="w-full md:w-56 flex flex-col justify-end space-y-4 border-l border-zinc-800/80 pl-8">
             <div className="flex items-center justify-between text-xs tracking-wider uppercase font-medium">
               <span className="text-zinc-600">Status</span>
               <div className="flex items-center space-x-2">
                 <span className="relative flex h-1.5 w-1.5">
                  {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isActive ? 'bg-emerald-500' : 'bg-zinc-600'}`}></span>
                </span>
                 <span className={isActive ? 'text-emerald-400' : 'text-zinc-400'}>{agent.status}</span>
               </div>
             </div>
             <div className="flex items-center justify-between text-xs tracking-wider uppercase font-medium">
               <span className="text-zinc-600">Load</span>
               <span className={`capitalize ${agent.load === 'normal' ? 'text-zinc-300' : 'text-amber-400'}`}>{agent.load}</span>
             </div>
             <div className="flex items-center justify-between text-xs tracking-wider uppercase font-medium">
               <span className="text-zinc-600">Last Active</span>
               <span className="text-zinc-300 lowercase tracking-normal">just now</span>
             </div>
             
             <div className="pt-6 mt-2 border-t border-zinc-800/50 flex flex-col gap-2">
                <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold tracking-wide uppercase bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded border border-zinc-700/50 transition">
                  Role Card <ChevronRight className="w-3 h-3 text-zinc-500" />
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
