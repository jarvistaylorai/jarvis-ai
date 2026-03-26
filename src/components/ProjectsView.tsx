import React, { useState } from 'react';
import { useProjects } from '@/hooks/useMissionControl';
import { useRouter } from 'next/navigation';
import { 
  FolderKanban, Activity, MoreVertical, Play, Pause, Plus, Zap, 
  AlertTriangle, CheckCircle, Clock, Users, X, ChevronDown, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

import { ProjectFocusView } from './ProjectFocusView';

const Card = ({ children, className = "", onClick }: { children?: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-[#0f0f11] border border-white/[0.04] rounded-2xl shadow-2xl p-5 relative cursor-pointer ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, colorClass }: { children?: React.ReactNode; colorClass?: string }) => (
  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md ${colorClass}`}>
    {children}
  </span>
);

export const ProjectsView = ({ activeWorkspace = 'business' }: { activeWorkspace?: string }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { data: projectsData, isLoading, refetch } = useProjects(activeWorkspace);
  const projects = projectsData?.data || [];
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "product",
    template: "Default",
    priority: "MEDIUM",
    auto_assign: true,
    automation_enabled: false,
    mode: "manual",
    deadline: ""
  });



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects?workspace=${activeWorkspace}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const newProject = await res.json();
        await fetch(`/api/projects/${newProject.id}/bootstrap`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ template: form.template })
        });
        await refetch();
        setIsDrawerOpen(false);
        setForm({
          name: "", description: "", type: "product", template: "Default", 
          priority: "MEDIUM", auto_assign: true, automation_enabled: false, 
          mode: "manual", deadline: ""
        });
        setShowAdvanced(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (e: React.MouseEvent, projectId: string, action: string, currentData?: unknown) => {
    e.stopPropagation();
    try {
       if (action === 'start') {
         await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'BUILD' }) });
       } else if (action === 'pause') {
         await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PAUSED' }) });
       } else if (action === 'auto') {
         await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ automation_enabled: !currentData.automation_enabled }) });
       } else if (action === 'add_task') {
         const title = prompt("Enter task title:");
         if (title) {
            await fetch(`/api/tasks?workspace=${activeWorkspace}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, project_id: projectId }) });
         }
       }
       refetch();
    } catch(err) {
       console.error(err);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'No activity';
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getHealthColor = (health: string) => {
    if (health === 'HEALTHY') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    if (health === 'BLOCKED') return 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
    if (health === 'AT_RISK') return 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse';
    if (health === 'STALLED') return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
  };

  if (isLoading) {
    return <div className="p-8 text-zinc-500 animate-pulse uppercase tracking-widest text-xs font-bold flex items-center justify-center h-64">Loading Execution Containers...</div>;
  }

  if (selectedProjectId) {
    return <ProjectFocusView 
      projectId={selectedProjectId} 
      activeWorkspace={activeWorkspace}
      onBack={() => {
        setSelectedProjectId(null);
        refetch();
      }} 
    />;
  }

  return (
    <div className="animate-in fade-in duration-500 relative min-h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-light text-white tracking-tight flex items-center gap-3">
            <FolderKanban className="text-indigo-400" size={24} />
            Execution Containers
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Manage and track portfolio trajectory</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0a0a0b] border border-white/[0.05] rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors w-64"
          />
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400/20"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.filter(p => !p.name.includes('(Archived)') && (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())))).map((proj) => (
          <Card 
            key={proj.id} 
            onClick={() => setSelectedProjectId(proj.id)}
            className="group hover:border-white/[0.1] hover:bg-white/[0.01] transition-all overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
              <FolderKanban size={100} className="text-indigo-400 -mr-8 -mt-8" />
            </div>
            
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="flex items-center gap-3 w-full pr-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-black border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                  <FolderKanban size={18} className="text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-white truncate">{proj.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge colorClass="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{proj.status || 'IDEA'}</Badge>
                    <Badge colorClass={`${proj.priority === 'HIGH' || proj.priority === 'CRITICAL' || proj.priority === 'high' || proj.priority === 'mission_critical' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                      {proj.priority === 'mission_critical' ? 'CRITICAL' : proj.priority || 'MEDIUM'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4 relative z-10 flex-grow">
              <p className="text-sm text-zinc-500 line-clamp-2 min-h-[40px] leading-relaxed opacity-80">
                {proj.description || 'No execution context provided.'}
              </p>
            </div>

            <div className="flex justify-between items-center mb-2 relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Execution Progress</span>
              <div className="flex items-center gap-1.5 text-indigo-400 text-sm font-mono font-bold shadow-indigo-500/20 drop-shadow-md">
                <span>{proj.progress}%</span>
              </div>
            </div>

            <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-white/5 relative z-10 mb-4 shadow-inner">
              <div 
                className={`h-full relative transition-all duration-500 ${proj.progress > 0 ? 'bg-gradient-to-r from-indigo-600 to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.6)]' : 'bg-zinc-800'}`}
                style={{ width: `${proj.progress > 0 ? proj.progress : 100}%`, backgroundColor: proj.progress === 0 ? 'transparent' : undefined }}
              ></div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs mb-4 relative z-10">
              <div className="flex flex-col gap-1">
                 <span className="text-zinc-600 uppercase tracking-widest text-[9px] font-bold">Tasks</span>
                 <div className="flex items-center gap-1.5 text-zinc-300">
                   <CheckCircle size={14} className="text-zinc-500" />
                   <span className="font-mono">{proj.task_count || 0}</span>
                   {proj.blocked_tasks > 0 && <span className="text-rose-400 font-bold ml-1">({proj.blocked_tasks} BLOCKED)</span>}
                 </div>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-zinc-600 uppercase tracking-widest text-[9px] font-bold">Agents</span>
                 <div className="flex items-center gap-1.5 text-zinc-300">
                   <Users size={14} className="text-zinc-500" />
                   <span className="font-mono">{proj.derived_agents || 0}</span>
                 </div>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-zinc-600 uppercase tracking-widest text-[9px] font-bold">Health</span>
                 <div className="flex items-center gap-1.5">
                   <div className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${getHealthColor(proj.health)}`}>
                     {proj.health === 'AT_RISK' ? <AlertTriangle size={10} /> : <Activity size={10} />}
                     {proj.health || 'HEALTHY'}
                   </div>
                 </div>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-zinc-600 uppercase tracking-widest text-[9px] font-bold">Trace</span>
                 <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                   <Clock size={12} />
                   <span>Last activity: {getTimeAgo(proj.last_activity_at)}</span>
                 </div>
              </div>
            </div>

            {/* Quick Action Row */}
            <div className="pt-3 border-t border-white/[0.04] mt-1 relative z-20 flex justify-between items-center bg-[#0a0a0b] -mx-5 -mb-5 px-5 py-3 rounded-b-2xl">
              <div className="flex gap-2">
                <Link href={`/projects/${proj.id}/board`} onClick={(e) => e.stopPropagation()} title="Open Board" className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors">
                  <FolderKanban size={14} />
                </Link>
                <button title="Start" onClick={(e) => handleAction(e, proj.id, 'start')} className="p-1.5 rounded-lg text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                  <Play size={14} />
                </button>
                <button title="Pause" onClick={(e) => handleAction(e, proj.id, 'pause')} className="p-1.5 rounded-lg text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                  <Pause size={14} />
                </button>
                <button title="Add Task" onClick={(e) => handleAction(e, proj.id, 'add_task')} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors">
                  <Plus size={14} />
                </button>
                <button title="Enable Auto" onClick={(e) => handleAction(e, proj.id, 'auto', proj)} className={`p-1.5 rounded-lg transition-colors ${proj.automation_enabled ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/5'}`}>
                  <Zap size={14} className={proj.automation_enabled ? 'animate-pulse' : ''} fill={proj.automation_enabled ? 'currentColor' : 'none'}/>
                </button>
              </div>
              <button title="More" onClick={(e) => { e.stopPropagation(); alert('More actions dropdown'); }} className="p-1.5 rounded-lg text-zinc-600 hover:text-white transition-colors">
                <MoreVertical size={14} />
              </button>
            </div>
            
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
         <div className="w-full mt-12 p-12 border border-white/5 border-dashed rounded-3xl flex flex-col items-center justify-center text-center">
            <FolderKanban size={48} className="text-zinc-800 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No active projects</h3>
            <p className="text-zinc-500 text-sm max-w-sm">Initialize an execution container to program streams of autonomous or manual tasks.</p>
            <button onClick={() => setIsDrawerOpen(true)} className="mt-6 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-indigo-500/20 transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              Initialize Project
            </button>
         </div>
      )}

      {/* NEW PROJECT RIGHT DRAWER */}
      {isDrawerOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsDrawerOpen(false)} 
          />
          
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0a0a0b] shadow-[0_0_50px_rgba(0,0,0,0.8)] border-l border-white/[0.05] flex flex-col animate-in slide-in-from-right duration-300 ease-out">
            <div className="p-6 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-[#0f0f11]">
              <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <FolderKanban size={16} className="text-indigo-400" />
                </div>
                Initialize Project
              </h3>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="text-zinc-500 hover:text-white hover:bg-white/[0.05] p-2 rounded-lg transition-all"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 custom-scrollbar">
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Project Name</label>
                <input 
                  type="text" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-inner"
                  placeholder="e.g. Core System Refactor"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Description</label>
                <textarea 
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none h-24 shadow-inner"
                  placeholder="Define objectives and scope..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Type</label>
                  <select 
                    value={form.type}
                    onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none shadow-inner"
                  >
                    <option value="product">Product</option>
                    <option value="internal">Internal Mode</option>
                    <option value="experiment">Experiment</option>
                    <option value="client">Client Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Priority</label>
                  <select 
                    value={form.priority}
                    onChange={e => setForm({...form, priority: e.target.value})}
                    className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none shadow-inner"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Boot Template</label>
                <select 
                  value={form.template}
                  onChange={e => setForm({...form, template: e.target.value})}
                  className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none shadow-inner"
                >
                  <option value="Default">Blank execution stream</option>
                  <option value="AI Product">AI Product (5 standard tasks)</option>
                  <option value="SaaS Platform">SaaS Platform</option>
                  <option value="Internal Tool">Internal Tool</option>
                  <option value="Experiment">Research Experiment</option>
                </select>
              </div>

              <div className="pt-6 border-t border-white/[0.04] mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAdvanced(!showAdvanced)} 
                  className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest w-full"
                >
                  {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Advanced Execution Settings
                </button>
                
                {showAdvanced && (
                  <div className="mt-5 flex flex-col gap-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-[#050505]">
                      <div>
                        <div className="text-xs font-medium text-white mb-0.5">Auto Assign Hooks</div>
                        <div className="text-[10px] text-zinc-500">Route tasks to least-loaded agents</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={form.auto_assign} onChange={e => setForm({...form, auto_assign: e.target.checked})} />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-[#050505]">
                      <div>
                        <div className="text-xs font-medium text-white mb-0.5">Automation Constraints</div>
                        <div className="text-[10px] text-zinc-500">Allow autonomous trigger loops</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={form.automation_enabled} onChange={e => setForm({...form, automation_enabled: e.target.checked})} />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Autonomy Mode</label>
                        <select 
                          value={form.mode}
                          onChange={e => setForm({...form, mode: e.target.value})}
                          className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none"
                        >
                          <option value="manual">Manual</option>
                          <option value="assisted">Assisted</option>
                          <option value="autonomous">Autonomous (Agentic)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">Deadline (Optional)</label>
                        <input 
                          type="date" 
                          value={form.deadline}
                          onChange={e => setForm({...form, deadline: e.target.value})}
                          className="w-full bg-[#050505] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-white/[0.04] bg-[#0f0f11] shrink-0 flex justify-end gap-3 rounded-bl-xl rounded-br-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
               <button 
                 onClick={() => setIsDrawerOpen(false)}
                 className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all border border-transparent"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleSubmit} 
                 disabled={!form.name || isSubmitting}
                 className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:shadow-none min-w-[160px] relative overflow-hidden group"
               >
                 <span className={`transition-opacity ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>Deploy Project 👉</span>
                 {isSubmitting && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
