'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Target, ArrowLeft, Plus, Trash2, Calendar, ChevronRight,
  CheckCircle, Circle, Clock, Layers, Edit3, GripVertical, X, ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Agent, Task, Project, Alert, TelemetryEvent, Objective } from '@/types/contracts';

const Card = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <div className={`bg-[#0f0f11] border border-white/[0.04] rounded-2xl shadow-2xl p-5 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, colorClass }: { children?: React.ReactNode; colorClass?: string }) => (
  <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg ${colorClass}`}>
    {children}
  </span>
);

const priorityColors: Record<string, string> = {
  HIGH: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  LOW: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  high: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  low: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  IN_PROGRESS: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  COMPLETED: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
};

const phaseStatusColors: Record<string, string> = {
  NOT_STARTED: 'text-zinc-500',
  IN_PROGRESS: 'text-amber-400',
  COMPLETED: 'text-emerald-400',
};

interface ObjectiveDetailViewProps {
  objectiveId: string;
  projects: Project[];
  onBack: () => void;
}

export const ObjectiveDetailView = ({ objectiveId, projects, onBack }: ObjectiveDetailViewProps) => {
  const router = useRouter();
  const [objective, setObjective] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [newPhaseTitle, setNewPhaseTitle] = useState('');
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [assigningTaskPhaseId, setAssigningTaskPhaseId] = useState<string | null>(null);
  const newPhaseRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const editTaskRef = useRef<HTMLInputElement>(null);

  const fetchObjective = async () => {
    try {
      const res = await fetch(`/api/objectives/${objectiveId}`);
      if (res.ok) {
        const data = await res.json();
        setObjective(data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchObjective();
    const interval = setInterval(fetchObjective, 3000);
    return () => clearInterval(interval);
  }, [objectiveId]);

  useEffect(() => {
    if (isAddingPhase && newPhaseRef.current) newPhaseRef.current.focus();
  }, [isAddingPhase]);

  useEffect(() => {
    if (editingPhaseId && editRef.current) editRef.current.focus();
  }, [editingPhaseId]);

  const handleAddPhase = async () => {
    if (!newPhaseTitle.trim()) return;
    try {
      await fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective_id: objectiveId, title: newPhaseTitle.trim() })
      });
      setNewPhaseTitle('');
      setIsAddingPhase(false);
      await fetchObjective();
    } catch (err) { console.error(err); }
  };

  const handleRenamePhase = async (phaseId: string) => {
    if (!editingTitle.trim()) {
      setEditingPhaseId(null);
      return;
    }
    // Optimistic update
    setObjective((prev: Record<string, unknown>) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases?.map((p: Project) => p.id === phaseId ? { ...p, title: editingTitle.trim() } : p)
      };
    });
    setEditingPhaseId(null);
    try {
      await fetch(`/api/phases/${phaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() })
      });
      await fetchObjective();
    } catch (err) { console.error(err); }
  };

  const handleDeletePhase = async (phaseId: string) => {
    try {
      await fetch(`/api/phases/${phaseId}`, { method: 'DELETE' });
      if (selectedPhaseId === phaseId) setSelectedPhaseId(null);
      await fetchObjective();
    } catch (err) { console.error(err); }
  };

  const handleDeleteObjective = async () => {
    try {
      await fetch(`/api/objectives/${objectiveId}`, { method: 'DELETE' });
      onBack();
    } catch (err) { console.error(err); }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      await fetchObjective();
    } catch (err) { console.error(err); }
  };

  const handleRenameTask = async (taskId: string) => {
    if (!editingTaskTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    // Optimistic update
    setObjective((prev: Record<string, unknown>) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases?.map((p: Project) => ({
          ...p,
          tasks: p.tasks?.map((t: Task) => t.id === taskId ? { ...t, title: editingTaskTitle.trim() } : t)
        }))
      };
    });
    setEditingTaskId(null);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTaskTitle.trim() })
      });
      await fetchObjective();
    } catch (err) { console.error(err); }
  };

  const handleUnassignTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_id: null })
      });
      await fetchObjective();
    } catch (err) { console.error(err); }
  };

  const handlePriorityChange = async (newPriority: string) => {
    // Optimistic update
    setObjective((prev: Record<string, unknown>) => ({ ...prev, priority: newPriority }));
    try {
      await fetch(`/api/objectives/${objectiveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });
      await fetchObjective();
    } catch (err) { console.error(err); }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!objective) {
    return (
      <div className="animate-in fade-in duration-500 text-center py-20">
        <p className="text-zinc-500">Objective not found.</p>
        <button onClick={onBack} className="mt-4 text-amber-400 hover:text-amber-300 text-sm">← Go back</button>
      </div>
    );
  }

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const num = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000);
    if (num < 1) return 'Just now';
    if (num < 60) return `${num}m ago`;
    if (num < 1440) return `${Math.floor(num / 60)}h ago`;
    return `${Math.floor(num / 1440)}d ago`;
  };

  const selectedPhase = selectedPhaseId
    ? objective.phases?.find((p: Project) => p.id === selectedPhaseId)
    : null;

  return (
    <div className="animate-in fade-in duration-500">
      {/* BACK BUTTON */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">Back to Objectives</span>
      </button>

      {/* HEADER */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Badge colorClass={statusColors[objective.status] || statusColors.ACTIVE}>{objective.status?.replace('_', ' ')}</Badge>
            <Badge colorClass={priorityColors[objective.priority] || priorityColors.MEDIUM}>{objective.priority}</Badge>
            {objective.project && (
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.05]">
                {objective.project.name}
              </span>
            )}
            {objective.tasks_completed_today > 0 && (
              <div className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                +{objective.tasks_completed_today} tasks completed today
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{objective.title}</h1>
          {objective.current_phase && (
            <div className="text-sm text-zinc-400 mb-3 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Current Phase &rarr;</span>
              <span className="text-amber-400 font-medium">{objective.current_phase}</span>
            </div>
          )}
          {objective.description && (
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">{objective.description}</p>
          )}
        </div>

        {/* Progress ring */}
        <div className="text-right shrink-0 ml-8">
          <div className="text-5xl font-light text-white tracking-tight">
            {objective.progress}<span className="text-xl text-zinc-500 ml-1">%</span>
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Overall Progress</div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="w-full bg-black h-3 rounded-full overflow-hidden border border-white/5 mb-2 shadow-inner">
        <div
          className={`h-full relative transition-all duration-500 ${objective.progress > 0 ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-transparent'}`}
          style={{ width: `${objective.progress || 0}%` }}
        />
      </div>
      <div className="text-xs text-zinc-500 mt-1 mb-10 flex justify-between">
        <span>{objective.progress}% complete • {objective.phases?.filter((p: Project) => p.status==='COMPLETED').length || 0}/{objective.phases?.length || 0} phases</span>
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT — PHASES TIMELINE */}
        <div className="col-span-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em] flex items-center gap-2">
              <Layers size={14} className="text-amber-500" />
              Execution Phases
            </h2>
            <span className="text-[10px] text-zinc-600 font-mono">{objective.phases?.length || 0} phases</span>
          </div>

          <div className="flex flex-col gap-3">
            {objective.phases?.map((phase: any, index: number) => {
              const isSelected = selectedPhaseId === phase.id;
              const isEditing = editingPhaseId === phase.id;
              const isActive = phase.status === 'IN_PROGRESS';
              const phaseIcon = phase.status === 'COMPLETED'
                ? <CheckCircle size={18} className="text-emerald-400" />
                : phase.status === 'IN_PROGRESS'
                  ? <Clock size={18} className="text-amber-400 animate-pulse" />
                  : <Circle size={18} className="text-zinc-600" />;

              return (
                <div key={phase.id} className="relative">
                  {/* Timeline connector */}
                  {index < (objective.phases?.length || 0) - 1 && (
                    <div className="absolute left-[21px] top-[48px] w-0.5 h-[calc(100%-12px)] bg-white/[0.04]" />
                  )}

                  <div
                    className={`flex flex-col gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
                      isActive && !isSelected
                        ? 'bg-[#0f0a05] border-amber-500/40 shadow-[0_0_0_1px_rgba(245,158,11,0.4),_0_0_20px_rgba(245,158,11,0.15)] scale-[1.01]'
                        : isSelected
                          ? 'bg-amber-500/[0.05] border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]'
                          : 'bg-[#0a0a0b] border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.01]'
                    }`}
                    onClick={() => {
                      setSelectedPhaseId(isSelected ? null : phase.id);
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Phase icon */}
                      <div className="mt-0.5 shrink-0">{phaseIcon}</div>

                    {/* Phase content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        {isEditing ? (
                          <input
                            ref={editRef}
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            onBlur={() => handleRenamePhase(phase.id)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRenamePhase(phase.id); if (e.key === 'Escape') setEditingPhaseId(null); }}
                            onClick={e => e.stopPropagation()}
                            className="bg-transparent text-white font-medium text-sm border-b border-amber-500/50 focus:outline-none w-full"
                          />
                        ) : (
                          <h4 className="text-sm font-medium text-white truncate">{phase.title}</h4>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          <button
                            onClick={e => { e.stopPropagation(); setEditingPhaseId(phase.id); setEditingTitle(phase.title); }}
                            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors"
                            title="Rename"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeletePhase(phase.id); }}
                            className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Phase progress */}
                      <div className="flex items-center gap-3 mb-1">
                        <div className="flex-1 bg-black h-1.5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              phase.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-amber-600 to-amber-400'
                            }`}
                            style={{ width: `${phase.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400 font-mono shrink-0">{phase.progress}%</span>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                        <span>{phase.completed_tasks || 0}/{phase.task_count || 0} tasks</span>
                        <span className={phaseStatusColors[phase.status] || 'text-zinc-500'}>{phase.status?.replace('_', ' ')}</span>
                        {phase.target_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {formatDate(phase.target_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    </div>
                    {/* Action Row */}
                    <div className="flex gap-2 mt-1 ml-[42px]" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          if (objective.project?.id) {
                            window.location.hash = `tasks?projectId=${objective.project.id}&phaseId=${phase.id}`;
                          } else {
                            setSelectedPhaseId(phase.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-md text-xs font-medium text-zinc-300 transition-colors flex items-center gap-2"
                      >
                        ▶ Open Tasks
                      </button>
                      <button
                        onClick={() => {
                          if (objective.project?.id) {
                            window.location.hash = `tasks?projectId=${objective.project.id}&phaseId=${phase.id}`;
                          } else {
                            setAssigningTaskPhaseId(phase.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-md text-xs font-medium text-zinc-300 transition-colors flex items-center gap-2"
                      >
                        <Plus size={12} /> Add Task
                      </button>
                      {phase.status !== 'COMPLETED' && (
                        <button
                          onClick={() => {}} // TODO: Phase completion endpoint
                          className="px-3 py-1.5 hover:bg-white/[0.05] rounded-md text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                        >
                          <CheckCircle size={12} /> Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Phase */}
            {isAddingPhase ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.03]">
                <Plus size={18} className="text-amber-500 shrink-0" />
                <input
                  ref={newPhaseRef}
                  value={newPhaseTitle}
                  onChange={e => setNewPhaseTitle(e.target.value)}
                  onBlur={handleAddPhase}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddPhase(); if (e.key === 'Escape') { setIsAddingPhase(false); setNewPhaseTitle(''); } }}
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-zinc-600"
                  placeholder="Phase name..."
                />
                <button
                  onClick={handleAddPhase}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 uppercase tracking-widest shrink-0"
                >
                  Add
                </button>
                <button
                  onClick={() => { setIsAddingPhase(false); setNewPhaseTitle(''); }}
                  className="text-zinc-500 hover:text-white shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingPhase(true)}
                className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-white/[0.06] hover:border-amber-500/30 hover:bg-amber-500/[0.02] text-zinc-500 hover:text-amber-400 transition-all group"
              >
                <Plus size={18} className="group-hover:text-amber-400" />
                <span className="text-sm font-medium">Add Phase</span>
              </button>
            )}

            {/* Empty phases state */}
            {(!objective.phases || objective.phases.length === 0) && !isAddingPhase && (
              <div className="text-center py-12 text-zinc-600">
                <Layers size={32} className="mx-auto mb-3 text-zinc-700" />
                <p className="text-sm">No phases yet — define your execution plan</p>
              </div>
            )}
          </div>

          {/* SELECTED PHASE TASKS */}
          {selectedPhase && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
                  TASKS IN "{selectedPhase.title}"
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {selectedPhase.completed_tasks || 0}/{selectedPhase.task_count || 0} completed
                  </span>
                  <button
                    onClick={() => setAssigningTaskPhaseId(selectedPhase.id)}
                    className="px-2 py-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                  >
                    <Plus size={10} /> Add Task
                  </button>
                </div>
              </div>

              {selectedPhase.tasks && selectedPhase.tasks.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedPhase.tasks.map((task: Task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#0a0a0b] border border-white/[0.04] hover:border-white/[0.08] transition-colors group"
                    >
                      <button
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        className="shrink-0"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle size={18} className="text-emerald-400" />
                        ) : (
                          <Circle size={18} className="text-zinc-600 hover:text-amber-400 transition-colors" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        {editingTaskId === task.id ? (
                          <input
                            ref={editTaskRef}
                            value={editingTaskTitle}
                            onChange={e => setEditingTaskTitle(e.target.value)}
                            onBlur={() => handleRenameTask(task.id)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameTask(task.id); if (e.key === 'Escape') setEditingTaskId(null); }}
                            className="bg-transparent text-white font-medium text-sm border-b border-amber-500/50 focus:outline-none w-full"
                          />
                        ) : (
                          <span
                            onClick={(e) => { e.stopPropagation(); setEditingTaskId(task.id); setEditingTaskTitle(task.title); }}
                            className={`text-sm block truncate cursor-text ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}
                          >
                            {task.title}
                          </span>
                        )}
                      </div>

                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                        task.priority === 'critical' ? 'text-rose-400 bg-rose-500/10' :
                        task.priority === 'high' ? 'text-amber-400 bg-amber-500/10' :
                        'text-zinc-500 bg-zinc-800'
                      }`}>
                        {task.priority}
                      </span>
                      <button
                        onClick={() => handleUnassignTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-rose-400 transition-all"
                        title="Remove from phase"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-white/[0.05] rounded-xl">
                  <p className="text-sm text-zinc-600">No tasks assigned to this phase yet.</p>
                  <p className="text-xs text-zinc-700 mt-1">Assign tasks from the task board using the phase filter.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="col-span-4 flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-4">Details</h3>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">NEXT ACTION</p>
                <p className="text-sm font-medium text-amber-400">
                  {objective.current_phase ? `Start tasks in ${objective.current_phase}` : "Define execution phases"}
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">BLOCKERS</p>
                <p className="text-sm text-zinc-300">
                  No blockers
                </p>
              </div>
              
              {objective.project && (
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Project</div>
                  <div 
                    className="text-sm text-zinc-300 flex items-center gap-1 cursor-pointer hover:text-amber-400 transition-colors"
                    onClick={() => router.push(`/projects/${objective.project.id}`)}
                  >
                    {objective.project.name}
                    <ExternalLink size={12} className="opacity-50" />
                  </div>
                </div>
              )}

              <div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Priority</div>
                <select
                  value={objective.priority?.toUpperCase() || 'MEDIUM'}
                  onChange={(e) => handlePriorityChange(e.target.value.toLowerCase())}
                  className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg appearance-none cursor-pointer focus:outline-none ${priorityColors[objective.priority] || priorityColors.MEDIUM}`}
                >
                  <option value="LOW" className="bg-zinc-900 text-zinc-400 font-bold">LOW</option>
                  <option value="MEDIUM" className="bg-zinc-900 text-amber-500 font-bold">MEDIUM</option>
                  <option value="HIGH" className="bg-zinc-900 text-rose-400 font-bold">HIGH</option>
                </select>
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Target Date</div>
                <div className="text-sm text-zinc-300 flex items-center gap-2">
                  <Calendar size={13} className="text-zinc-600" />
                  {formatDate(objective.target_date) || 'No target date'}
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Current Phase</div>
                <div className="text-sm text-amber-400 font-medium flex items-center gap-2">
                  <ChevronRight size={13} />
                  {objective.current_phase || 'No active phase'}
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Created</div>
                <div className="text-sm text-zinc-300">{formatDate(objective.created_at)}</div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsAddingPhase(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-amber-400 hover:bg-amber-500/[0.05] border border-white/[0.04] hover:border-amber-500/20 transition-all"
              >
                <Plus size={14} />
                Add Phase
              </button>
              <button
                onClick={handleDeleteObjective}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-rose-400 hover:bg-rose-500/[0.05] border border-white/[0.04] hover:border-rose-500/20 transition-all"
              >
                <Trash2 size={14} />
                Delete Objective
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
