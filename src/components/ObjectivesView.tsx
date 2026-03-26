'use client';

import React, { useState, useEffect } from 'react';
import { Target, Plus, X, Calendar, ChevronRight, Layers, Clock } from 'lucide-react';
import { ObjectiveDetailView } from './ObjectiveDetailView';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@/types/contracts';

const Card = ({ children, className = "", onClick }: { children?: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-[#0f0f11] border border-white/[0.04] rounded-2xl shadow-2xl p-6 relative cursor-pointer ${className}`}>
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

export const ObjectivesView = ({ objectives: initialObjectives = [], projects = [], activeWorkspace = \'business\' }: { objectives?: unknown[], projects?: unknown[], activeWorkspace?: string }) => {
  const [objectives, setObjectives] = useState<any[]>(initialObjectives || []);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 'MEDIUM',
    target_date: '',
  });

  const fetchObjectives = async () => {
    try {
      const res = await fetch(`/api/objectives?workspace=${activeWorkspace}`);
      if (res.ok) {
        const data = await res.json();
        setObjectives(data);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchObjectives();
    // Removed aggressive polling to fix rendering glitches
  }, [activeWorkspace]);

  const handleSubmit = async () => {
    if (!form.title) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/objectives?workspace=${activeWorkspace}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          project_id: form.project_id || null,
        })
      });
      if (res.ok) {
        await fetchObjectives();
        setIsDrawerOpen(false);
        setForm({ title: '', description: '', project_id: '', priority: 'MEDIUM', target_date: '' });
      }
    } catch (err) { console.error(err); }
    finally { setIsSubmitting(false); }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const num = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000);
    if (num < 1) return 'Just now';
    if (num < 60) return `${num}m ago`;
    if (num < 1440) return `${Math.floor(num / 60)}h ago`;
    return `${Math.floor(num / 1440)}d ago`;
  };

  if (selectedObjectiveId) {
    return (
      <ObjectiveDetailView
        objectiveId={selectedObjectiveId}
        projects={projects}
        onBack={() => {
          setSelectedObjectiveId(null);
          fetchObjectives();
        }}
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-500 relative min-h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-semibold text-white tracking-tight flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-black border border-amber-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Target size={20} className="text-amber-400" />
            </div>
            Strategic Objectives
          </h2>
          <p className="text-sm text-zinc-500 mt-2 ml-14">Define high-level goals and track execution through phases</p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] border border-amber-400/30"
        >
          <Plus size={16} />
          New Objective
        </button>
      </div>

      {/* OBJECTIVES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {objectives.map((obj: Objective) => {
          const completedPhases = obj.phases?.filter((p: Project) => p.status === 'COMPLETED').length || 0;
          const totalPhases = obj.phases?.length || obj.phase_count || 0;
          const isHighPriority = obj.priority?.toUpperCase() === 'HIGH';
          
          return (
          <Card
            key={obj.id}
            onClick={() => setSelectedObjectiveId(obj.id)}
            className={`group hover:border-amber-500/20 hover:bg-white/[0.01] transition-all overflow-hidden ${
              isHighPriority ? 'shadow-[0_0_10px_rgba(255,80,80,0.3)]' : ''
            }`}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <Target size={140} className="text-amber-400 -mt-12 -mr-12" />
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Badge colorClass={statusColors[obj.status] || statusColors.ACTIVE}>{obj.status?.replace('_', ' ')}</Badge>
              <Badge colorClass={priorityColors[obj.priority] || priorityColors.MEDIUM}>{obj.priority}</Badge>
              {obj.project && (
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider ml-auto">
                  {obj.project.name}
                </span>
              )}
            </div>

            {/* Title & Description */}
            <h3 className="text-xl font-semibold text-white mb-2 relative z-10 leading-tight">{obj.title}</h3>
            {obj.description && (
              <p className="text-sm text-zinc-500 mb-5 line-clamp-2 relative z-10">{obj.description}</p>
            )}

            {/* PROGRESS */}
            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Progress</span>
              <span className="text-lg font-semibold text-white">
                {obj.progress}<span className="text-sm text-zinc-500 ml-0.5">%</span>
              </span>
            </div>
            <div className="w-full bg-black h-2.5 rounded-full overflow-hidden border border-white/5 relative z-10 mb-2 shadow-inner">
              <div
                className={`h-full relative transition-all duration-500 ${obj.progress > 0 ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-transparent'}`}
                style={{ width: `${obj.progress || 0}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500 mt-1 mb-5 relative z-10 flex justify-between">
              <span>{obj.progress}% complete • {completedPhases}/{totalPhases} phases</span>
              {obj.last_activity_at && (
                <span className="text-zinc-600">Last updated: {timeAgo(obj.last_activity_at)}</span>
              )}
            </div>

            {/* Bottom stats */}
            <div className="grid grid-cols-2 gap-3 relative z-10 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-2">
                <ChevronRight size={13} className="text-amber-500" />
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Current</div>
                  <div className="text-xs text-zinc-300 font-medium truncate">{obj.current_phase || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-zinc-600" />
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Target</div>
                  <div className="text-xs text-zinc-300 font-medium">{formatDate(obj.target_date) || '—'}</div>
                </div>
              </div>
            </div>
          </Card>
        )})}
      </div>

      {/* EMPTY STATE */}
      {objectives.length === 0 && (
        <div className="w-full mt-16 p-16 border border-white/5 border-dashed rounded-3xl flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
            <Target size={28} className="text-amber-500/50" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No active objectives</h3>
          <p className="text-zinc-500 text-sm max-w-md mb-6">Define your strategic goals and track execution through phases and tasks.</p>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]"
          >
            Define First Objective
          </button>
        </div>
      )}

      {/* NEW OBJECTIVE DRAWER */}
      {isDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0a0a0b] shadow-[0_0_60px_rgba(0,0,0,0.9)] border-l border-white/[0.05] flex flex-col animate-in slide-in-from-right duration-300 ease-out">
            {/* Drawer Header */}
            <div className="p-6 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-[#0f0f11]">
              <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Target size={16} className="text-amber-400" />
                </div>
                New Objective
              </h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-zinc-500 hover:text-white hover:bg-white/[0.05] p-2 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Objective Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner"
                  placeholder="e.g. Launch Medellin Social Club"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all resize-none h-24 shadow-inner"
                  placeholder="Define the strategic vision..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Linked Project</label>
                <select
                  value={form.project_id}
                  onChange={e => setForm({ ...form, project_id: e.target.value })}
                  className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none shadow-inner"
                >
                  <option value="">No project linked</option>
                  {(projects || []).map((p: Project) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none shadow-inner"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Target Date</label>
                  <input
                    type="date"
                    value={form.target_date}
                    onChange={e => setForm({ ...form, target_date: e.target.value })}
                    className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-3 py-3 text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50 transition-colors shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-white/[0.04] bg-[#0f0f11] shrink-0 flex justify-end gap-3">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.title || isSubmitting}
                className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(245,158,11,0.2)] min-w-[160px] relative overflow-hidden"
              >
                <span className={`transition-opacity ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>Create Objective</span>
                {isSubmitting && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
