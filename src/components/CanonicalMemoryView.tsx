'use client';

import React, { useState, useEffect } from 'react';
import { BrainCircuit, RefreshCw, CheckCircle, ShieldAlert, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function CanonicalMemoryView() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

    const fetchMemory = async () => {
    setLoading(true);
    try {
      // For viewing purposes, we assume it's synced. Let's trigger a sync and get from DB.
      await handleSync();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const syncRes = await fetch('/api/memory/sync-canonical');
      if (syncRes.ok) {
        setLastSync(new Date().toLocaleTimeString());
        
        // Fetch orchestrator agents core files
        const wsRes = await fetch('/api/workspaces/orchestrator');
        if (wsRes.ok) {
           const wsData = await wsRes.json();
           if (wsData.files && wsData.files['MEMORY.md']) {
             setContent(wsData.files['MEMORY.md']);
           }
        }
      }
    } catch (error) {
       console.error('Failed to sync', error);
    } finally {
       setSyncing(false);
    }
  };

  return (
    <div className="flex h-full flex-col font-sans animate-in fade-in zoom-in-95 duration-500 max-w-5xl mx-auto">
      
      {/* Premium Header */}
      <div className="relative mb-8 rounded-2xl overflow-hidden border border-amber-500/20 bg-[#0a0a0b] shadow-[0_0_40px_rgba(245,158,11,0.05)]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-amber-500/[0.02] to-transparent z-0"></div>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
        
        <div className="relative z-10 p-8 flex items-start justify-between">
           <div>
             <div className="flex items-center gap-3 mb-3">
               <div className="w-10 h-10 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                 <BrainCircuit className="text-amber-400 w-5 h-5" />
               </div>
               <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 tracking-wider">
                 CANONICAL MEMORY
               </h1>
             </div>
             <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
               The durable, single source of truth for Jarvis operating parameters, identity constraints, and system assumptions. Kept in absolute sync with global orchestration layers.
             </p>
           </div>

           <div className="flex flex-col items-end">
             <button 
               onClick={handleSync}
               disabled={syncing}
               className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.05] hover:border-amber-500/30 hover:bg-amber-500/10 rounded-xl transition-all font-bold tracking-widest text-[10px] uppercase group disabled:opacity-50"
             >
               <RefreshCw size={14} className={`text-amber-500 group-hover:text-amber-400 ${syncing ? 'animate-spin' : ''}`} />
               <span className="text-amber-500 group-hover:text-amber-300 shadow-amber-500/20 drop-shadow-md">
                 {syncing ? 'Syncing Pipeline...' : 'Force Sync'}
               </span>
             </button>
             {lastSync && (
               <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500 tracking-widest uppercase font-mono">
                 <CheckCircle size={10} className="text-emerald-500" />
                 Last Sync: {lastSync}
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Memory Content Viewer */}
      <div className="flex-1 rounded-2xl border border-white/5 bg-[#0f0f11] shadow-2xl overflow-hidden flex flex-col relative">
        <div className="h-10 border-b border-white/5 bg-white/[0.02] flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-2">
             <ShieldAlert size={14} className="text-zinc-500" />
             <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">Read-Only Global Scope</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
            <span className="text-[10px] tracking-[0.2em] font-mono text-emerald-400">MEMORY ALIGNED</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-full gap-4">
               <Cpu className="w-8 h-8 text-amber-500/40 animate-pulse" />
               <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-semibold animate-pulse">Decoupling Knowledge Graphes...</p>
             </div>
           ) : (
             <div className="prose prose-invert prose-amber max-w-none 
                prose-h1:text-xl prose-h1:font-black prose-h1:text-amber-400 prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-2
                prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-zinc-300 prose-h2:font-bold prose-h2:mt-8
                prose-p:text-sm prose-p:text-zinc-400 prose-p:leading-relaxed
                prose-ul:text-sm prose-ul:text-zinc-400
                prose-strong:text-amber-100 prose-strong:font-bold
                prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-amber-200">
               <ReactMarkdown remarkPlugins={[remarkGfm]}>
                 {content || '*MEMORY.md is currently empty or unreadable.*'}
               </ReactMarkdown>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
