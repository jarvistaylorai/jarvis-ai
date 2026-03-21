import React from 'react';
import { Document } from '@/lib/docs';

interface DocEditorProps {
  doc: Document | null;
  onSave: (title: string, content: string, category: string, tags: string[]) => void;
  onCancel: () => void;
}

export function DocEditor({ doc, onSave, onCancel }: DocEditorProps) {
  const [title, setTitle] = React.useState(doc?.title || '');
  const [content, setContent] = React.useState(doc?.content || '');
  const [category, setCategory] = React.useState(doc?.category || 'system');
  const [tags, setTags] = React.useState(doc?.tags?.join(', ') || '');

  const handleSave = () => {
    const tagArray = tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
    onSave(title, content, category, tagArray);
  };

  return (
    <div className="h-full flex flex-col space-y-4 p-6 bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-neutral-100">
          {doc ? 'Edit Document' : 'New Document'}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-neutral-400 mb-1">Title</label>
          <input
            type="text"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md py-2 px-3 text-neutral-200 outline-none focus:border-emerald-500 transition"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="w-1/3">
          <label className="block text-sm font-medium text-neutral-400 mb-1">Category</label>
          <input
            type="text"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md py-2 px-3 text-neutral-200 outline-none focus:border-emerald-500 transition"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-400 mb-1">Tags (comma separated)</label>
        <input
          type="text"
          className="w-full bg-neutral-950 border border-neutral-800 rounded-md py-2 px-3 text-neutral-200 outline-none focus:border-emerald-500 transition"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. agents, memory, config"
        />
      </div>

      <div className="flex-1 flex flex-col pt-2">
        <label className="block text-sm font-medium text-neutral-400 mb-1">Content (Markdown)</label>
        <textarea
          className="flex-1 w-full bg-neutral-950 border border-neutral-800 rounded-md py-3 px-4 text-neutral-200 font-mono text-sm leading-relaxed outline-none focus:border-emerald-500 transition resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
    </div>
  );
}
