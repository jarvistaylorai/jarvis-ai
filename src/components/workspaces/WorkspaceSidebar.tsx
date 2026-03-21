import React from 'react';
import { useRouter } from 'next/navigation';
import { Brain, FileText, Activity, Wrench, BookOpen, Fingerprint, Target, Settings2 } from 'lucide-react';
import clsx from 'clsx';

const FILE_ICONS: Record<string, React.ReactNode> = {
  'IDENTITY.md': <Fingerprint className="w-4 h-4" />,
  'MISSION.md': <Target className="w-4 h-4" />,
  'OPERATIONS.md': <Settings2 className="w-4 h-4" />,
  'MEMORY.md': <Brain className="w-4 h-4" />,
  'CONTEXT.md': <Activity className="w-4 h-4" />,
  'TASKS.md': <FileText className="w-4 h-4" />,
  'TOOLS.md': <Wrench className="w-4 h-4" />,
  'SOUL.md': <Fingerprint className="w-4 h-4" />,
  'AGENTS.md': <BookOpen className="w-4 h-4" />,
};

interface SidebarProps {
  agents: string[];
  currentAgentId: string;
  files: string[];
  selectedFile: string;
  onFileSelect: (file: string) => void;
  onAgentSelect?: (agentId: string) => void;
  onNewFile?: () => void;
}

export const WorkspaceSidebar = ({ agents, currentAgentId, files, selectedFile, onFileSelect, onAgentSelect, onNewFile }: SidebarProps) => {
  const router = useRouter();

  // Custom sort to always show primary files in a specific order
  const orderedFiles = [
    'IDENTITY.md',
    'MISSION.md',
    'OPERATIONS.md',
    'MEMORY.md',
    'CONTEXT.md',
    'TASKS.md',
    'TOOLS.md'
  ];

  const displayFiles = [...orderedFiles.filter(f => files.includes(f)), ...files.filter(f => !orderedFiles.includes(f))];

  return (
    <div className="w-72 bg-[#111111] border-r border-[#222222] flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="p-6">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2 mb-8">
          <Fingerprint className="w-5 h-5 text-amber-500" />
          Identity
        </h2>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Agents</h3>
          </div>
          <div className="space-y-1">
            {agents.map(ag => (
              <button
                type="button"
                key={ag}
                onClick={() => onAgentSelect ? onAgentSelect(ag) : router.push(`/workspaces/${ag}`)}
                className={clsx(
                  "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 focus:outline-none focus:ring-0 border",
                  currentAgentId === ag 
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a1a]"
                )}
              >
                <div className={clsx(
                  "w-6 h-6 rounded flex items-center justify-center text-xs",
                  currentAgentId === ag ? "bg-amber-500/20 text-amber-500" : "bg-zinc-800 text-zinc-400"
                )}>
                  {ag.charAt(0).toUpperCase()}
                </div>
                <span className="capitalize">{ag}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
           <div className="flex items-center justify-between mb-4 px-2">
             <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Files</h3>
             {onNewFile && (
               <button
                 type="button"
                 onClick={onNewFile}
                 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
                 title="Create New File"
               >
                 + New
               </button>
             )}
           </div>
           <div className="space-y-1">
             {displayFiles.length > 0 ? displayFiles.map(file => (
               <button
                 type="button"
                 key={file}
                 onClick={() => onFileSelect(file)}
                 className={clsx(
                   "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-3 group focus:outline-none focus:ring-0 border",
                   selectedFile === file 
                     ? "bg-[#1a1a1a] text-zinc-100 border-[#333] shadow-sm" 
                     : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#151515]"
                 )}
               >
                 <div className={clsx(
                   "transition-colors",
                   selectedFile === file ? "text-blue-400" : "text-zinc-600 group-hover:text-zinc-400"
                 )}>
                    {FILE_ICONS[file] || <FileText className="w-4 h-4" />}
                 </div>
                 {file}
                 {selectedFile === file && (
                   <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                 )}
               </button>
             )) : (
                <div className="text-xs text-zinc-600 px-2 italic">Loading files...</div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};
