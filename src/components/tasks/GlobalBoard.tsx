'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragStartEvent, DragOverEvent, DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from '../board/TaskCard';
import { TaskModal } from '../board/TaskModal';
import { Task, Label } from '../board/types';
import { MoreHorizontal } from 'lucide-react';

const STATUS_COLUMNS = [
  { id: 'pending', title: 'Pending' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'blocked', title: 'Blocked' },
  { id: 'completed', title: 'Completed' },
];

function GlobalColumn({ id, title, tasks, onTaskClick }: { id: string, title: string, tasks: Task[], onTaskClick: (t: Task) => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'Column', id },
  });

  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
  const style = { transition, transform: CSS.Transform.toString(transform) };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="w-80 shrink-0 bg-[#0a0a0b]/50 rounded-2xl h-full border-2 border-indigo-500/50 border-dashed opacity-50" />;
  }

  return (
    <div ref={setNodeRef} style={style} className="w-80 shrink-0 bg-[#050505] rounded-2xl flex flex-col max-h-full border border-white/[0.04] shadow-2xl">
      <div {...attributes} {...listeners} className="p-4 font-bold text-white flex items-center justify-between cursor-grab active:cursor-grabbing group bg-[#0a0a0b] rounded-t-2xl border-b border-white/[0.04]">
        <div className="flex-1 truncate text-[13px] px-2 py-1 uppercase tracking-widest text-zinc-300">
          {title} <span className="text-zinc-600 ml-2">{tasks.length}</span>
        </div>
        <button className="p-1 hover:bg-white/5 rounded text-zinc-500 hover:text-white transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task.id} task={task} onClick={onTaskClick} />)}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="text-center p-4 border border-dashed border-white/5 rounded-xl text-zinc-600 text-xs font-semibold uppercase tracking-wider">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}

interface GlobalBoardProps {
  tasks: Task[];
}

export function GlobalBoard({ tasks: initialTasks }: GlobalBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);

  // Fetch labels on mount
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const res = await fetch('/api/labels?project_id=global');
        if (res.ok) setLabels(await res.json());
      } catch (e) {}
    };
    fetchLabels();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status).sort((a,b) => (a.position || 0) - (b.position || 0));

  const handleDragStart = (e: DragStartEvent) => {
    if (e.active.data.current?.type === 'Task') {
      setActiveTask(e.active.data.current.task);
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    if (active.id === over.id) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    setTasks(prev => {
      const activeTaskIdx = prev.findIndex(t => t.id === active.id);
      const activeStatus = prev[activeTaskIdx].status;
      const overStatus = isOverColumn ? over.id : (isOverTask ? prev.find(t => t.id === over.id)?.status : null);

      if (!activeStatus || !overStatus || activeStatus === overStatus) return prev;

      const newTasks = [...prev];
      newTasks[activeTaskIdx] = { ...newTasks[activeTaskIdx], status: overStatus as string };
      active.data.current = { ...active.data.current, task: newTasks[activeTaskIdx] };
      return newTasks;
    });
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (active.data.current?.type === 'Task') {
      const activeStatus = active.data.current.task.status;
      const overStatus = over.data.current?.type === 'Column' ? overId : over.data.current?.task?.status;
      
      const prevTask = initialTasks.find(t => t.id === activeId);
      if (prevTask && prevTask.status !== activeStatus) {
         try {
           await fetch(`/api/tasks/${activeId}`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ status: activeStatus })
           });
           // Re-fetch or sync state conceptually handled via Dashboard refresh anyway.
         } catch(err) { console.error('Failed to patch status', err); }
      }
    }
  };

  return (
    <div className="flex-1 h-full overflow-x-auto overflow-y-hidden custom-scrollbar bg-transparent p-6 pt-0">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex h-full items-start gap-4">
          <SortableContext items={STATUS_COLUMNS.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {STATUS_COLUMNS.map(col => (
              <GlobalColumn key={col.id} id={col.id} title={col.title} tasks={getTasksByStatus(col.id)} onTaskClick={setSelectedTask} />
            ))}
          </SortableContext>
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} onClick={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          projectLabels={labels} 
          onLabelsChange={setLabels}
          onUpdateTask={(updates) => setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...updates } as Task : t))} 
        />
      )}
    </div>
  );
}
