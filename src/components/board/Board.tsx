'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableList } from './SortableList';
import { TaskCard } from './TaskCard';
import { ListData, Task } from './types';
import { Plus } from 'lucide-react';

interface BoardProps {
  initialLists: ListData[];
  projectId: string; // The ID for lists
  taskProjectId?: string; // Optional: The ID for creating new tasks. If omitted, uses projectId.
  onTaskClick?: (task: Task) => void;
  activeWorkspace?: string;
}

export function Board({ initialLists, projectId, taskProjectId, onTaskClick, activeWorkspace = 'business' }: BoardProps) {
  const [lists, setLists] = useState<ListData[]>(initialLists);

  // Sync lists state when initialLists content actually changes (e.g. after API data loads on refresh)
  const prevInitialRef = useRef<string>('');
  useEffect(() => {
    const serialized = JSON.stringify(initialLists);
    if (serialized !== prevInitialRef.current) {
      prevInitialRef.current = serialized;
      Promise.resolve().then(() => setLists(initialLists));
    }
  }, [initialLists]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeList, setActiveList] = useState<ListData | null>(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px tolerance for clicks
      },
    }),
    useSensor(KeyboardSensor)
  );

  const listsIds = lists.map((l) => l.id);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === 'List') {
      setActiveList(active.data.current?.list as ListData);
      return;
    }
    if (type === 'Task') {
      setActiveTask(active.data.current?.task as Task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverList = over.data.current?.type === 'List';

    if (!isActiveTask) return;

    // Moving task to another task or empty list
    setLists((prevLists) => {
      const activeListId = active.data.current?.task?.list_id || findListForTask(prevLists, activeId as string)?.id;
      const overListId = isOverList ? (overId as string) : findListForTask(prevLists, overId as string)?.id;

      if (!activeListId || !overListId || activeListId === overListId) {
        return prevLists; // Reordered in same list handled by DragEnd
      }

      // Moving task across lists (handled instantly for UI)
      const activeListIdx = prevLists.findIndex((l) => l.id === activeListId);
      const overListIdx = prevLists.findIndex((l) => l.id === overListId);

      const activeList = prevLists[activeListIdx];
      const overList = prevLists[overListIdx];

      const activeTaskIdx = activeList.tasks.findIndex((t) => t.id === activeId);
      const overTaskIdx = isOverTask
        ? overList.tasks.findIndex((t) => t.id === overId)
        : overList.tasks.length;

      const newLists = [...prevLists];
      const activeTask = { ...activeList.tasks[activeTaskIdx], status: overListId as string };

      newLists[activeListIdx] = {
        ...activeList,
        tasks: activeList.tasks.filter((t) => t.id !== activeId),
      };

      const newOverTasks = [...overList.tasks];
      newOverTasks.splice(overTaskIdx, 0, activeTask);

      newLists[overListIdx] = {
        ...overList,
        tasks: newOverTasks,
      };

      active.data.current = {
        ...active.data.current,
        task: activeTask,
      };

      return newLists;
    });
  };

  const API_REORDER_TASK = async (taskId: string, listId: string, position: number) => {
    fetch(`/api/tasks/reorder?workspace=${activeWorkspace}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, new_list_id: listId, new_position: position })
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setActiveList(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const type = active.data.current?.type;

    if (type === 'List') {
      setLists((prevLists) => {
        const oldIndex = prevLists.findIndex((l) => l.id === activeId);
        const newIndex = prevLists.findIndex((l) => l.id === overId);
        // Optimization: fire API update for lists
        return arrayMove(prevLists, oldIndex, newIndex);
      });
      return;
    }

    if (type === 'Task') {
      setLists((prevLists) => {
        const activeListId = active.data.current?.task?.list_id || findListForTask(prevLists, activeId as string)?.id;
        const overListId = over.data.current?.type === 'List' ? (overId as string) : findListForTask(prevLists, overId as string)?.id;
        
        if (!activeListId || !overListId) return prevLists;

        const activeListIdx = prevLists.findIndex((l) => l.id === activeListId);
        const activeList = prevLists[activeListIdx];
        
        const oldTaskIdx = activeList.tasks.findIndex((t) => t.id === activeId);
        const newTaskIdx = activeList.tasks.findIndex((t) => t.id === overId);

        if (activeListId === overListId) {
          // Reorder within the same list
          const newTasks = arrayMove(activeList.tasks, oldTaskIdx, newTaskIdx);
          const newLists = [...prevLists];
          newLists[activeListIdx] = { ...activeList, tasks: newTasks };

          // Calc new position, assume 1024 spacing
          const prevPos = newTasks[newTaskIdx - 1]?.position || 0;
          const nextPos = newTasks[newTaskIdx + 1]?.position || prevPos + 2048;
          const updatedPos = Math.round((prevPos + nextPos) / 2);
          
          API_REORDER_TASK(activeId as string, activeListId, updatedPos);
          return newLists;
        } else {
           // Across lists is resolved in DragOver, just fire the API patch here
           // Find task in new list
           const overListIdx = prevLists.findIndex(l => l.id === overListId);
           const overListTasks = prevLists[overListIdx].tasks;
           const movedTaskIdx = overListTasks.findIndex(t => t.id === activeId);
           
           const prevPos = overListTasks[movedTaskIdx - 1]?.position || 0;
           const nextPos = overListTasks[movedTaskIdx + 1]?.position || prevPos + 2048;
           const updatedPos = Math.round((prevPos + nextPos) / 2);

           API_REORDER_TASK(activeId as string, overListId, updatedPos);
           return prevLists;
        }
      });
    }
  };

  const findListForTask = (lists: ListData[], taskId: string) => {
    return lists.find((l) => l.tasks.some((t) => t.id === taskId));
  };

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    // Disabled in Supabase (statuses are ENUMs)
  };

  const handleAddTask = async (listId: string, title: string) => {
    try {
      const validStatus = listId.replace('-', '_');
      const res = await fetch(`/api/tasks?workspace=${activeWorkspace}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: validStatus, project_id: taskProjectId || projectId, title })
      });
      if (res.ok) {
        const task = await res.json();
        setLists((prev) => prev.map(l => l.id === listId ? { ...l, tasks: [...l.tasks, task] } : l));
      }
    } catch(err) {}
  };

  const handleUpdateListTitle = async (listId: string, name: string) => {
    setLists(prev => prev.map(l => l.id === listId ? { ...l, name } : l));
  };

  const handleStatusChange = (task: Task, newStatus: string) => {
    setLists(prev => prev.map(l => ({
      ...l,
      tasks: l.tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
    })));
  };

  return (
    <div className="flex-1 h-full overflow-x-auto overflow-y-hidden scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-transparent p-6 pt-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full items-start gap-4 min-w-full justify-between">
          <SortableContext items={listsIds} strategy={horizontalListSortingStrategy}>
            {lists.map((list) => (
              <SortableList 
                key={list.id} 
                list={list} 
                onTaskClick={onTaskClick || (() => {})} 
                onAddTask={handleAddTask}
                onUpdateTitle={handleUpdateListTitle}
                onStatusChange={handleStatusChange}
              />
            ))}
          </SortableContext>

        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} onClick={() => {}} /> : null}
          {activeList ? (
            <div className="w-80 shrink-0 bg-[#050505] rounded-2xl flex flex-col max-h-full border-2 border-indigo-500 shadow-2xl opacity-80 h-full cursor-grabbing p-4 font-bold tracking-wider uppercase text-[13px] text-white">
               {activeList.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
