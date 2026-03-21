import React from 'react';
import { Document } from '@/lib/docs';
import { MarkdownRenderer } from './MarkdownRenderer';
import { format } from 'date-fns';
import { Bot, Network } from 'lucide-react';

interface DocViewerProps {
  doc: Document | null;
  onEdit: () => void;
}

export function DocViewer({ doc, onEdit }: DocViewerProps) {
  if (!doc) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500">
        <Network size={48} className="mb-4 opacity-50" />
        <p>Select a document from the sidebar to view its contents.</p>
      </div>
    );
  }

  // Generate a simple AI summary placeholder for now
  const summary = doc.content.slice(0, 150).replace(/#/g, '').trim() + '...';

  return (
    <div className="max-w-4xl mx-auto py-8 px-8 flex flex-col h-full overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-neutral-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-100 mb-2">{doc.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-neutral-500">
            <span className="capitalize">{doc.category}</span>
            <span>•</span>
            <span>Updated {format(new Date(doc.updated_at), 'MMM dd, yyyy')}</span>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="px-4 py-2 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
        >
          Edit Mode
        </button>
      </div>

      {/* Tags */}
      {doc.tags && doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {doc.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-neutral-800 text-neutral-400 text-xs rounded-full border border-neutral-700">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* AI Summary Banner */}
      <div className="flex items-start space-x-3 bg-neutral-900/50 border border-indigo-900/30 p-4 rounded-lg mb-8">
        <Bot className="text-indigo-400 shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="text-sm font-medium text-indigo-300 mb-1">AI Quick Summary</h4>
          <p className="text-sm text-neutral-400">{summary}</p>
        </div>
      </div>

      {/* Markdown Content */}
      <div className="flex-1 mb-12">
        <MarkdownRenderer content={doc.content} />
      </div>

      {/* Related Docs Placeholder */}
      <div className="pt-6 border-t border-neutral-800">
        <h4 className="text-sm font-medium text-neutral-400 mb-3">Related Knowledge</h4>
        <div className="flex space-x-4">
          <div className="px-4 py-3 bg-neutral-900 rounded border border-neutral-800 w-48 cursor-pointer hover:border-neutral-600 transition">
            <p className="text-sm font-medium text-neutral-300">Agent Hierarchy</p>
            <p className="text-xs text-neutral-500 mt-1">Architecture</p>
          </div>
          <div className="px-4 py-3 bg-neutral-900 rounded border border-neutral-800 w-48 cursor-pointer hover:border-neutral-600 transition">
            <p className="text-sm font-medium text-neutral-300">Task Orchestrator</p>
            <p className="text-xs text-neutral-500 mt-1">Tasks</p>
          </div>
        </div>
      </div>
    </div>
  );
}
