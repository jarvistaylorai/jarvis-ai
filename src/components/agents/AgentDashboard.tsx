"use client";

import { useState } from "react";
import { Agent } from "@/types/agent";
import { AgentCard } from "./AgentCard";
import { JarvisCard } from "./JarvisCard";

import { OldAgentCard } from "./OldAgentCard";
import { TreeAgentCard } from "./TreeAgentCard";

export function AgentDashboard({ agents }: { agents: Agent[] }) {
  const [view, setView] = useState<"hierarchy" | "roster">("hierarchy");

  const founderAgent = agents.find(a => a.layer === 'founder') || {
    id: "me",
    name: "Roy Taylor",
    role: "Founder & CEO",
    description: "Ironman",
    capabilities: ["Strategic Planning", "Executive Decision Making", "Ecosystem Oversight"],
    status: "active",
    load: "normal",
    layer: "founder",
    last_active_at: new Date().toISOString()
  } as Agent;

  const coreAgent = agents.find(a => a.layer === 'core') || {
    id: "jarvis",
    name: "Henry",
    role: "Chief of Staff",
    description: "Opus 4.6",
    capabilities: ["Orchestration", "Decision-Making", "Task Delegation"],
    status: "active",
    load: "normal",
    layer: "core",
    last_active_at: new Date().toISOString()
  } as Agent;

  const displayAgents = agents.filter(a => a.layer !== 'founder');

  const departmentAgents = agents.filter(a => a.layer !== 'founder' && a.layer !== 'core');

  return (
    <div className="w-full animate-in fade-in duration-500 text-white font-sans selection:bg-blue-500/30">
      <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-center max-w-6xl mx-auto gap-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100">Autonomous Agent Network</h1>
          <p className="text-zinc-400 mt-2 font-medium max-w-xl leading-relaxed">
            An AI-driven execution system that operates continuously across research, execution, and delivery layers.
          </p>
        </div>
        
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50 backdrop-blur-sm self-end">
            <button 
              onClick={() => setView("roster")}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase transition-all ${view === 'roster' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Roster
            </button>
            <button 
              onClick={() => setView("hierarchy")}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase transition-all ${view === 'hierarchy' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Hierarchy
            </button>
          </div>

          <div className="flex gap-8 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
            <div className="flex flex-col items-end">
              <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-1">Agents</span>
              <span className="font-mono text-zinc-200">{displayAgents.length} Active</span>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-1">System Load</span>
               <span className="font-mono text-emerald-400">Normal</span>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto transition-all duration-300">
        {displayAgents.length === 0 ? (
          <div className="text-center py-32 opacity-50">
            <h3 className="text-xl font-medium mb-2">No agents deployed yet</h3>
            <p className="text-sm">Deploy your first agent to begin execution</p>
          </div>
        ) : view === "hierarchy" ? (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 w-full relative pt-4 pb-20">
            {/* ROOT NODE: ME */}
            <div className="relative z-10 w-full max-w-[280px] flex justify-center">
              <TreeAgentCard agent={founderAgent} type="founder" />
            </div>

            {/* Connecting dashed line from Founder to Core */}
            <div className="w-px h-16 border-l border-dashed border-zinc-700/50"></div>

            {/* LEVEL 2: CORE SYSTEM */}
            <div className="relative z-10 w-full max-w-[320px] flex justify-center">
              <TreeAgentCard agent={coreAgent} type="core" />
            </div>

            {/* Connecting from Core to Departments */}
            {departmentAgents.length > 0 && (
              <>
                <div className="w-px h-16 border-l border-dashed border-zinc-700/50"></div>
                
                {/* Horizontal Branching Area */}
                <div className="w-full relative px-4 flex justify-center items-center">
                  <div className="absolute top-0 w-3/4 max-w-4xl h-px border-t border-dashed border-zinc-700/50"></div>
                  <div className="-mt-0.5 px-4 bg-[#050505]/90 backdrop-blur-sm text-[10px] font-bold tracking-[0.2em] text-fuchsia-500 uppercase rounded-full shadow-[0_0_15px_rgba(217,70,239,0.15)] border border-fuchsia-500/20 py-1 relative z-10">
                    Serves All Departments
                  </div>
                </div>

                {/* Subagents Grid (Departments) */}
                <div className="w-full max-w-6xl mt-16 px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-8 justify-items-center relative">
                   {departmentAgents.map((ag) => (
                     <div key={ag.id} className="relative w-full max-w-[300px] flex flex-col items-center">
                       {/* Drop line from horizontal branch to card */}
                       <div className="absolute -top-16 left-1/2 w-px h-16 border-l border-dashed border-zinc-700/50"></div>
                       <TreeAgentCard agent={ag} type="department" />
                     </div>
                   ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {displayAgents.map(ag => <OldAgentCard key={ag.id} agent={ag} />)}
          </div>
        )}
      </main>
    </div>
  );
}
