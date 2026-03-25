'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from './types';
import { Eye, CheckSquare, MessageSquare, Paperclip, Target, FolderKanban, Calendar } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: string) => void;
}

export function TaskCard({ task, onClick, onStatusChange }: TaskCardProps) {
  const isCompleted = task.status === 'completed';

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = isCompleted ? 'pending' : 'completed';
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      onStatusChange?.(task, newStatus);
    } catch (err) { console.error(err); }
  };
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const checklistTotal = task.checklists?.reduce((acc, c) => acc + c.items.length, 0) || 0;
  const checklistDone = task.checklists?.reduce((acc, c) => acc + c.items.filter(i => i.is_completed).length, 0) || 0;

  const hasIndicators = task.description || task.due_date || checklistTotal > 0 || (task.comments?.length > 0) || (task.attachments?.length > 0);

  const coverImage = task.attachments?.find(a => /\.(jpg|jpeg|png|gif|webp)$/i.test(a.file_name));
  const coverImageUrl = coverImage ? `/api/fs/raw?storagePath=${encodeURIComponent(coverImage.file_path)}` : null;

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full bg-[#0a0a0b] border-2 border-indigo-500/50 border-dashed rounded-xl p-3 opacity-50 min-h-[80px]"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className="relative bg-[#0f0f11] border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02] rounded-xl shadow-2xl cursor-pointer active:cursor-grabbing transition-all group flex flex-col overflow-hidden"
    >
      {coverImageUrl && (
        <div className="relative w-full h-32 bg-zinc-900 overflow-hidden shrink-0 border-b border-white/[0.04]">
           <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
           {task.project && (
             <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/90 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest shadow-xl max-w-[140px] z-10" title={`Project: ${task.project.name}`}>
               <FolderKanban size={10} className="shrink-0" />
               <span className="truncate">{task.project.name}</span>
             </div>
           )}
        </div>
      )}

      <div className={`p-3.5 relative flex-1 flex flex-col ${coverImageUrl ? 'pt-3' : ''}`}>
        
        {/* Top Section: Title (Left) + Badges (Right) */}
        <div className="flex items-start justify-between gap-3 mb-2">
          
          {/* Title Area */}
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <button
              onClick={handleToggleComplete}
              className={`focus:outline-none w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                isCompleted
                  ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'border-zinc-600 hover:border-indigo-500 bg-transparent'
              }`}
            >
              {isCompleted && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <h4 className={`text-sm font-medium leading-relaxed transition-colors break-words ${
              isCompleted
                ? 'text-zinc-500 line-through'
                : 'text-white group-hover:text-indigo-300'
            }`}>
              {task.title}
            </h4>
          </div>

          {/* Badges Area (Right side) */}
          <div className="flex flex-col items-end gap-1.5 shrink-0 max-w-[140px]">
            {/* Objective Phase Badge */}
            {task.phase && (
              <div 
                className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 border border-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-widest text-right"
                title={`${task.phase.objective.title}: ${task.phase.title}`}
              >
                <Target size={10} className="shrink-0" />
                <span className="truncate">{task.phase.title}</span>
              </div>
            )}

            {/* Project Badge */}
            {!coverImageUrl && task.project && (
              <div 
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-500/80 border border-indigo-400/30 text-white text-[10px] font-bold uppercase tracking-widest text-right shrink-0"
                title={`Project: ${task.project.name}`}
              >
                <FolderKanban size={10} className="shrink-0 opacity-80" />
                <span className="truncate">{task.project.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Labels Row */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 pl-7">
            {task.labels.map((tl) => (
              <span
                key={tl.label.id}
                className="px-2 py-1 rounded border border-black/10 text-[10px] font-bold uppercase tracking-wider text-black flex items-center"
                style={{ backgroundColor: tl.label.color }}
                title={tl.label.name}
              >
                 {tl.label.name}
              </span>
            ))}
          </div>
        )}

      {/* Bottom Row: Indicators + Avatars */}
      {hasIndicators && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.03]">
          {/* Left: Metric Icons */}
          <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
            {task.description && (
              <div className="flex items-center gap-1" title="Has description">
                <Eye className="w-3.5 h-3.5" />
              </div>
            )}
            
            {task.due_date && (
              <div className={`flex items-center gap-1.5 font-mono ${new Date(task.due_date) < new Date() ? 'text-rose-400 font-medium' : 'text-zinc-400'}`} title={`Due: ${new Date(task.due_date).toLocaleDateString()}`}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
            
            {task.comments?.length > 0 && (
              <div className="flex items-center gap-1 font-mono" title="Comments">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{task.comments.length}</span>
              </div>
            )}

            {checklistTotal > 0 && (
              <div className={`flex items-center gap-1 font-mono ${checklistDone === checklistTotal ? 'text-emerald-400' : ''}`} title="Checklist progress">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{checklistDone}/{checklistTotal}</span>
              </div>
            )}

            {task.attachments?.length > 0 && (
              <div className="flex items-center gap-1 font-mono" title="Attachments">
                <Paperclip className="w-3.5 h-3.5" />
                <span>{task.attachments.length}</span>
              </div>
            )}
          </div>

          {/* Right: Avatar(s) */}
          <div className="flex items-center -space-x-1.5">
            {task.assigned_to ? (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center border-2 border-[#0f0f11] shrink-0 shadow-lg" title={task.assigned_to}>
                <span className="text-[10px] font-bold text-white uppercase">
                  {task.assigned_to.substring(0, 2)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
