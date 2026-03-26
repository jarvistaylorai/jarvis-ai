'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Board } from '@/components/board/Board';
import { TaskModal } from '@/components/board/TaskModal';
import { ListData, Task, Label } from '@/components/board/types';
import { CheckSquare, Plus, Filter, ChevronDown, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTasks, useProjects } from '@/hooks/useMissionControl';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@contracts';

export const TasksView = ({ tasks: _t, projects: _p, globalLists = [], activeWorkspace = 'business' }: { tasks?: unknown[], projects?: unknown[], globalLists?: unknown[], activeWorkspace?: string }) => {
  const queryClient = useQueryClient();
  const { data: tasksData, isLoading: tasksLoading } = useTasks(activeWorkspace);
  const { data: projectsData } = useProjects(activeWorkspace);
  const tasks = tasksData?.data || _t || [];
  const projects = projectsData?.data || _p || [];
  const [projectIdFilter, setProjectIdFilter] = useState<string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes('projectId=')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const pid = params.get('projectId');
        if (pid && pid !== projectIdFilter) {
          setProjectIdFilter(pid);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch labels when project filter changes
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const pid = projectIdFilter === 'all' ? 'global' : projectIdFilter;
        const res = await fetch(`/api/labels?project_id=${pid}&workspace=${activeWorkspace}`);
        if (res.ok) setLabels(await res.json());
      } catch (e) {}
    };
    fetchLabels();
  }, [projectIdFilter]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task: Task) => {
      if (projectIdFilter !== 'all' && task.project_id !== projectIdFilter) return false;
      return true;
    }).map((task: Task) => {
      if (task.project_id) {
        const proj = projects.find((p: Project) => p.id === task.project_id);
        if (proj) return { ...task, project: { id: proj.id, name: proj.name } };
      }
      return task;
    });
  }, [tasks, projectIdFilter, projects]);

  const DEFAULT_BOARD_COLUMNS = [
    { id: 'ideas', name: 'Ideas' },
    { id: 'pending', name: 'To-Do' },
    { id: 'in_progress', name: 'Doing' },
    { id: 'under_review', name: 'Under Review' },
    { id: 'completed', name: 'Done' }
  ];

  const boardLists: ListData[] = useMemo(() => {
    const lists = globalLists && globalLists.length > 0 ? globalLists : DEFAULT_BOARD_COLUMNS;
    return lists.map((gl: Record<string, any>) => ({
      ...gl,
      tasks: filteredTasks.filter((t: Task) => t.status === gl.id || t.status === gl.id.replace('_', '-')).sort((a: any, b: any) => (a.position||0) - (b.position||0))
    }));
  }, [globalLists, filteredTasks]);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    let inProgress = 0;
    let completed = 0;
    let thisWeek = 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      filteredTasks.forEach((t: Task) => {
        if (t.status === 'in_progress' || t.status === 'in-progress' || t.status === 'under_review') inProgress++;
        if (t.status === 'completed' || t.status === 'done') completed++;
        if (new Date(t.created_at) > oneWeekAgo) thisWeek++;
      });

    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, inProgress, thisWeek, completion };
  }, [filteredTasks]);

  const activeProjectName = projectIdFilter === 'all' 
    ? 'All Projects' 
    : projects.find((p: Project) => p.id === projectIdFilter)?.name || 'Unknown';

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleUpdateTask = (updates: Partial<Task>) => {
    if (selectedTask) {
      const updatedTask = { ...selectedTask, ...updates };
      setSelectedTask(updatedTask);
      
      queryClient.setQueryData(['tasks', activeWorkspace], (old: Record<string, unknown>) => {
        if (!old || !old.data) return old;
        const tasks = [...old.data];
        const idx = tasks.findIndex((t: Task) => t.id === updatedTask.id);
        if (idx >= 0) tasks[idx] = updatedTask;
        return { ...old, data: tasks };
      });

      queryClient.setQueryData(['dashboard', activeWorkspace], (old: Record<string, unknown>) => {
        if (!old || !old.tasks) return old;
        const tasks = [...old.tasks];
        const idx = tasks.findIndex((t: Task) => t.id === updatedTask.id);
        if (idx >= 0) tasks[idx] = updatedTask;
        return { ...old, tasks };
      });
    }
  };

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col pb-8">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-light text-white tracking-tight flex items-center gap-3">
            <CheckSquare className="text-indigo-400" size={24} />
            Execution Queue
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Manage and assign task workflows across autonomous agents</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          
          <div className="flex items-center gap-4">
            {/* Custom Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-[#050505] hover:bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] rounded-xl px-4 py-2.5 shadow-inner transition-colors group"
            >
              <Filter size={14} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
              <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">
                Project: <span className="text-white ml-2">{activeProjectName}</span>
              </div>
              <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#0a0a0b] border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => {
                      setProjectIdFilter('all');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors group ${projectIdFilter === 'all' ? 'bg-indigo-500/10' : ''}`}
                  >
                    <div className="w-4 flex justify-center">
                      {projectIdFilter === 'all' && <Check size={14} className="text-indigo-400" />}
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${projectIdFilter === 'all' ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-white'}`}>
                      All Projects
                    </span>
                  </button>

                  <div className="h-px w-full bg-white/[0.04] my-1" />

                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setProjectIdFilter(p.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors group ${projectIdFilter === p.id ? 'bg-indigo-500/10' : ''}`}
                    >
                      <div className="w-4 flex justify-center">
                        {projectIdFilter === p.id && <Check size={14} className="text-indigo-400" />}
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${projectIdFilter === p.id ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-white'}`}>
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Plus size={16} /> New Task
            </button>
          </div>

          {/* STATS ROW */}
          <div className="flex items-center gap-6 mt-1 mr-1">
             <div className="flex items-baseline gap-2">
                <span className="text-2xl font-medium text-emerald-400">{stats.thisWeek}</span>
                <span className="text-[11px] text-zinc-500 font-medium">This week</span>
             </div>
             <div className="flex items-baseline gap-2">
                <span className="text-2xl font-medium text-indigo-400">{stats.inProgress}</span>
                <span className="text-[11px] text-zinc-500 font-medium">Doing</span>
             </div>
             <div className="flex items-baseline gap-2">
                <span className="text-2xl font-medium text-white">{stats.total}</span>
                <span className="text-[11px] text-zinc-500 font-medium">Total</span>
             </div>
             <div className="flex items-baseline gap-2">
                <span className="text-2xl font-medium text-purple-400">{stats.completion}%</span>
                <span className="text-[11px] text-zinc-500 font-medium">Completion</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 -mx-6 px-6">
        <Board 
          initialLists={boardLists} 
          projectId="global" 
          taskProjectId={projectIdFilter === 'all' ? 'global' : projectIdFilter} 
          onTaskClick={handleTaskClick} 
          activeWorkspace={activeWorkspace}
        />
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          activeWorkspace={activeWorkspace}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={() => setSelectedTask(null)}
          projectLabels={labels}
          onLabelsChange={setLabels}
          listName={DEFAULT_BOARD_COLUMNS.find((l: Record<string, unknown>) => l.id === selectedTask.status || l.id === selectedTask.status?.replace('_', '-'))?.name || 'Unknown'}
        />
      )}
    </div>
  );
};
