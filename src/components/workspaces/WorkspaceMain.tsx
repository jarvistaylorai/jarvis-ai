import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Play, Save, X, Edit2, Zap, BrainCircuit } from 'lucide-react';

interface WorkspaceMainProps {
  agentId: string;
  selectedFile: string;
  content: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onContentChange: (val: string) => void;
  isSaving: boolean;
  onShowPreview: () => void;
}

export const WorkspaceMain = ({
  agentId,
  selectedFile,
  content,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onContentChange,
  isSaving,
  onShowPreview
}: WorkspaceMainProps) => {

  const handleRunAgent = () => {
    // Scaffolded for future execution
    alert(`Executing Agent: ${agentId}`);
  };

  const handleMemorySnapshot = () => {
    alert("Snapshotting memory state to daily logs...");
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0c0c]">
      {/* Header */}
      <header className="h-16 border-b border-[#222222] flex items-center justify-between px-8 shrink-0 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex gap-2 items-center">
            <span className="text-zinc-500 capitalize">{agentId}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-100 font-mono text-sm px-2.5 py-1 bg-[#1a1a1a] rounded-lg border border-[#333]">
              {selectedFile}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={onShowPreview}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-zinc-300 text-sm font-medium transition-colors border border-[#333]"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            Live Context
          </button>
          
          <button 
            onClick={handleMemorySnapshot}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-zinc-300 text-sm font-medium transition-colors border border-[#333]"
          >
            <BrainCircuit className="w-4 h-4 text-blue-400" />
            Memory Snapshot
          </button>

          <div className="w-px h-6 bg-[#333] mx-2" />

          <button 
            onClick={handleRunAgent}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <Play className="w-4 h-4 fill-black" />
            Run Agent
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-end mb-8 border-b border-[#222] pb-6">
            <div>
              <h1 className="text-3xl font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-3">
                {selectedFile}
                <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-sans">
                  Active
                </span>
              </h1>
            </div>
            {!isEditing ? (
              <button 
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#1a1a1a] transition-all text-sm font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Quick Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={onCancel}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#1a1a1a] transition-all text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button 
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-blue-500 hover:bg-blue-400 text-white transition-all text-sm font-semibold shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save File'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden shadow-2xl relative">
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                className="w-full h-[600px] p-8 bg-transparent text-zinc-300 font-mono text-sm leading-relaxed focus:outline-none resize-y placeholder:text-zinc-700 custom-scrollbar"
                placeholder={`Start typing to edit ${selectedFile}...`}
                spellCheck={false}
              />
            ) : (
              <div className="p-8 prose prose-invert max-w-none prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-[#222] prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-400">
                {content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <div className="text-zinc-600 italic">This file is currently empty. Click &quot;Quick Edit&quot; to add content.</div>
                )}
              </div>
            )}
            
            <div className="absolute bottom-4 right-4 text-xs font-mono text-zinc-600 px-2 py-1 bg-[#0a0a0a] border border-[#222] rounded">
              {content.length} chars
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
