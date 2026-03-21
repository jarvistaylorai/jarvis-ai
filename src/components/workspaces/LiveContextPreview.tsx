import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LiveContextPreviewProps {
  files: Record<string, string>;
  onClose: () => void;
}

export const LiveContextPreview = ({ files, onClose }: LiveContextPreviewProps) => {
  const [copied, setCopied] = React.useState(false);

  // Combine files in a specific logical order for an agent prompt
  const orderedFiles = [
    'IDENTITY.md',
    'MISSION.md',
    'OPERATIONS.md',
    'MEMORY.md',
    'CONTEXT.md',
    'TASKS.md',
    'TOOLS.md'
  ];

  const combineContext = () => {
    let combined = '';
    orderedFiles.forEach(file => {
      if (files[file] && files[file].trim().length > 0) {
        combined += `\n\n--- [FILE: ${file}] ---\n\n${files[file].trim()}`;
      }
    });

    // Add any extra files not in standard list
    Object.keys(files).forEach(file => {
      if (!orderedFiles.includes(file) && files[file] && files[file].trim().length > 0) {
        combined += `\n\n--- [FILE: ${file}] ---\n\n${files[file].trim()}`;
      }
    });

    return combined.trim();
  };

  const contextString = combineContext();

  const handleCopy = () => {
    navigator.clipboard.writeText(contextString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[800px] h-[80vh] bg-[#111111] border border-[#333] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-16 border-b border-[#222] flex items-center justify-between px-6 shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Live Context Preview
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
              Final System Prompt
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payload Visualizer */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0c0c0c] custom-scrollbar text-sm">
          <div className="mb-4 text-zinc-500 font-mono text-xs">
            {"// The following context is injected into every LLM call for this agent"}
          </div>
          <div className="w-full h-full text-zinc-300 font-mono text-xs leading-relaxed whitespace-pre-wrap rounded-lg bg-[#0a0a0a] border border-[#222] p-6 !m-0">
             {contextString || "// No context files are populated yet."}
          </div>
        </div>
      </div>
    </div>
  );
};
