import React, { useState, useEffect } from 'react';
import { Command, Terminal, AlertTriangle, CheckCircle, Search } from 'lucide-react';

export const CommandBar = ({ isOpen, onClose, onExecute }: { isOpen: boolean, onClose: () => void, onExecute: () => void }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; actions_executed?: string[]; warnings?: string[]; error?: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose(); // This is effectively a toggle handled by parent
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/command/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: input })
      });
      const data = await res.json();
      setResult(data);
      onExecute();
    } catch (err: unknown) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl bg-[#0f0f11] border border-white/10 rounded-2xl shadow-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-top-4 fade-in duration-200">
        <form onSubmit={handleSubmit} className="relative flex items-center border-b border-white/[0.04] p-4 bg-[#0a0a0b]">
          <Search className="text-zinc-500 absolute left-8 pointer-events-none" size={20} />
          <input 
            type="text" 
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Enter natural language command..."
            className="w-full bg-transparent text-lg text-white font-light placeholder-zinc-600 focus:outline-none pl-12 pr-4 py-2"
          />
          <div className="flex gap-2 shrink-0 border border-white/5 rounded-lg px-2 py-1 bg-black/40 text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
            <span className="font-sans">⌘</span> K to close
          </div>
        </form>

        {(result || loading) && (
          <div className="p-6 bg-[#0f0f11]">
            <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-4 flex items-center gap-2">
              <Terminal size={12} /> Execution Feedback
            </h3>
            
            {loading && (
              <div className="flex items-center gap-3 text-zinc-400 text-sm">
                <span className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></span>
                Parsing and executing command...
              </div>
            )}
            
            {result && !loading && (
              <div className="flex flex-col gap-3 text-sm">
                {result.actions_executed && result.actions_executed.length > 0 && result.actions_executed.map((act, i) => (
                  <div key={'act-'+i} className="flex gap-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl items-start">
                    <CheckCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{act}</span>
                  </div>
                ))}

                {result.warnings && result.warnings.length > 0 && result.warnings.map((warn, i) => (
                  <div key={'warn-'+i} className="flex gap-3 text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl items-start">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{warn}</span>
                  </div>
                ))}
                
                {result.error && (
                  <div className="flex gap-3 text-rose-500 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl items-start">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{result.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
