import React from 'react';
import { Document } from '@/lib/docs';
import { Search, Folder, FileText, Plus } from 'lucide-react';

interface DocsSidebarProps {
  docs: Document[];
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  onNewDoc: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DocsSidebar({
  docs,
  selectedDocId,
  onSelectDoc,
  onNewDoc,
  searchQuery,
  onSearchChange,
}: DocsSidebarProps) {
  // Hardcoded Sections based on requirements
  const sections = [
    { label: 'Overview', filter: (d: Document) => d.id === 'doc-overview' },
    { label: 'Task Manager', filter: (d: Document) => d.category === 'tasks' },
    { label: 'Organization Chart', filter: (d: Document) => d.category === 'agents' },
    { label: 'Memory Architecture', filter: (d: Document) => d.category === 'memory' },
    { label: 'Playbooks', filter: (d: Document) => d.category === 'playbooks' },
    { label: 'Research', filter: (d: Document) => d.category === 'research' },
  ];

  const groupedDocsLabel = (label: string) => docs.filter(sections.find(s => s.label === label)?.filter || (() => false));

  return (
    <div className="w-72 bg-neutral-950 border-r border-neutral-800 flex flex-col h-full">
      <div className="p-4 border-b border-neutral-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">Knowledge Base</h2>
          <button 
            onClick={onNewDoc}
            className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded"
            title="Create New Document"
          >
            <Plus size={16} />
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-neutral-500" size={14} />
          <input
            type="text"
            placeholder="Search docs..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded py-2 pl-9 pr-3 text-sm text-neutral-300 outline-none focus:border-neutral-600 transition"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {searchQuery ? (
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 mb-2">SEARCH RESULTS</h3>
            <div className="space-y-1">
              {docs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => onSelectDoc(doc.id)}
                  className={`w-full text-left flex items-center px-2 py-1.5 text-sm rounded transition ${
                    selectedDocId === doc.id ? 'bg-emerald-900/30 text-emerald-400' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                  }`}
                >
                  <FileText size={14} className="mr-2 opacity-70 shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </button>
              ))}
              {docs.length === 0 && (
                <p className="text-xs text-neutral-600 px-2">No documents found.</p>
              )}
            </div>
          </div>
        ) : (
          sections.map(section => {
            const sectionDocs = groupedDocsLabel(section.label);
            if (sectionDocs.length === 0 && section.label !== 'Overview') return null;
            
            return (
              <div key={section.label}>
                <h3 className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide flex items-center">
                  <Folder size={12} className="mr-1.5" />
                  {section.label}
                </h3>
                <div className="space-y-1">
                  {sectionDocs.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => onSelectDoc(doc.id)}
                      className={`w-full text-left flex items-center px-2 py-1.5 text-sm rounded transition ${
                        selectedDocId === doc.id ? 'bg-emerald-900/30 text-emerald-400' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                      }`}
                    >
                      <FileText size={14} className="mr-2 opacity-70 shrink-0" />
                      <span className="truncate">{doc.title}</span>
                    </button>
                  ))}
                  {sectionDocs.length === 0 && (
                    <p className="text-xs text-neutral-600 px-2 italic">Empty</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
