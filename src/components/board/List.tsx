'use client';

import React, { useMemo, useState } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';
import { ListData, Task } from './types';
import { Plus, MoreHorizontal } from 'lucide-react';

interface ListProps {
  list: ListData;
  onTaskClick: (task: Task) => void;
  onAddTask: (listId: string, title: string) => void;
  onUpdateTitle?: (listId: string, name: string) => void;
  onStatusChange?: (task: Task, newStatus: string) => void;
}

export function ListComponent({ list, onTaskClick, onAddTask, onUpdateTitle, onStatusChange }: ListProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(list.name);

  const taskIds = useMemo(() => list.tasks.map((t) => t.id), [list.tasks]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: 'List',
      list,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      onAddTask(list.id, newTaskTitle.trim());
      setNewTaskTitle('');
    }
  };

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedTitle.trim() && editedTitle !== list.name && onUpdateTitle) {
      onUpdateTitle(list.id, editedTitle.trim());
    } else {
      setEditedTitle(list.name);
    }
    setIsEditingTitle(false);
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-80 shrink-0 bg-[#0a0a0b]/50 rounded-2xl h-full border-2 border-indigo-500/50 border-dashed opacity-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-80 shrink-0 bg-[#050505] rounded-2xl flex flex-col max-h-full border border-white/[0.04] shadow-2xl"
    >
      <div 
        {...attributes}
        {...listeners}
        className="p-4 font-bold text-white flex items-center justify-between cursor-grab active:cursor-grabbing group bg-[#0a0a0b] rounded-t-2xl border-b border-white/[0.04]"
      >
        {isEditingTitle ? (
          <form onSubmit={handleTitleSubmit} className="flex-1 mr-2" data-no-dnd="true">
            <input
              autoFocus
              className="w-full bg-[#0f0f11] text-sm px-3 py-1.5 rounded-lg text-white border border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              value={editedTitle}
              onChange={e => setEditedTitle(e.target.value)}
              onBlur={handleTitleSubmit}
            />
          </form>
        ) : (
          <div 
            className="flex-1 truncate text-[13px] px-2 py-1 cursor-text uppercase tracking-widest text-zinc-300"
            onClick={() => setIsEditingTitle(true)}
            data-no-dnd="true"
          >
            {list.name}
          </div>
        )}
        <button className="p-1 hover:bg-white/5 rounded text-zinc-500 hover:text-white transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {list.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} onStatusChange={onStatusChange} />
          ))}
        </SortableContext>
      </div>

      <div className="p-3 bg-[#050505] border-t border-white/[0.04] rounded-b-2xl">
        {isAddingTask ? (
          <form onSubmit={handleAddTask} className="bg-[#0f0f11] p-3 rounded-xl border border-white/[0.04] shadow-inner">
            <textarea
              autoFocus
              className="w-full bg-transparent text-white resize-none outline-none placeholder:text-zinc-600 text-sm h-16"
              placeholder="Enter a title for this card..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddTask(e);
                } else if (e.key === 'Escape') {
                  setIsAddingTask(false);
                  setNewTaskTitle('');
                }
              }}
            />
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.04]">
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              >
                Add Card
              </button>
              <button 
                type="button" 
                onClick={() => setIsAddingTask(false)}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors ml-auto"
                aria-label="Cancel"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingTask(true)}
            className="w-full flex items-center gap-3 text-sm font-semibold tracking-wide text-zinc-500 hover:text-indigo-400 hover:bg-white/[0.02] p-3 rounded-xl transition-all group border border-transparent hover:border-white/[0.04]"
          >
            <Plus className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400" />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}
