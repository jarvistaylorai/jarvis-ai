import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, Activity, Play, Pause, Plus, Zap, AlertTriangle, 
  CheckCircle, Clock, Users, TerminalSquare, ShieldAlert
} from 'lucide-react';

export const ProjectFocusView = ({ projectId, onBack, activeWorkspace = 'business' }: { projectId: string; onBack: () => void; activeWorkspace?: string; }) => {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
         setProject(await res.json());
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    const interval = setInterval(fetchProject, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleAction = async (action: string) => {
    try {
       let data = {};
       if (action === 'start') data = { status: 'BUILD' };
       if (action === 'pause') data = { status: 'PAUSED' };
       if (action === 'auto') data = { automation_enabled: !project?.automation_enabled };
       
       await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
       });
       fetchProject();
    } catch (e) {}
  };

  const handleAddTask = async () => {
    const title = prompt("Enter task title:");
    if (!title) return;
    try {
       await fetch(`/api/tasks?workspace=${activeWorkspace}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, project_id: projectId })
       });
       fetchProject();
    } catch(e) {}
  };

  if (loading) return <div className="h-full flex items-center justify-center text-zinc-500">Loading project...</div>;
  if (!project) return <div className="h-full flex items-center justify-center text-zinc-500">Project not found.</div>;

  const tasks = project.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  
  const getHealthColor = (health: string) => {
    if (health === 'HEALTHY') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    if (health === 'AT_RISK') return 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse';
    if (health === 'BLOCKED') return 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.4)]';
    return 'text-zinc-400 bg-zinc-800 border-zinc-700';
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-zinc-300 font-sans tracking-tight overflow-hidden animate-in fade-in duration-300 border border-white/[0.04] rounded-2xl shadow-2xl">
      
      {/* Header */}
      <header className="h-20 border-b border-white/[0.04] bg-[#0a0a0b] flex items-center px-8 shrink-0 relative z-10">
        <button 
          onClick={onBack}
          className="mr-6 flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors group"
        >
           <ArrowLeft size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
        </button>
        
        <div className="flex-1 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
              {project.name}
              <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md border text-indigo-400 bg-indigo-500/10 border-indigo-500/20`}>{project.status || 'IDEA'}</span>
              <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md border ${project.priority === 'CRITICAL' || project.priority === 'HIGH' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>{project.priority || 'MEDIUM'}</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 w-64">
            <div className="w-full flex flex-col gap-1.5 pt-1">
               <div className="flex justify-between items-center text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                 <span>Execution Progress</span>
                 <span className="text-indigo-400">{progress}%</span>
               </div>
               <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
                 <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }}></div>
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 overflow-hidden flex">
        
        {/* Left Content (Tabs + Items) */}
        <div className="flex-1 flex flex-col border-r border-white/[0.04] bg-[#0f0f12]">
          <div className="flex gap-1 px-8 pt-6 border-b border-white/[0.04]">
            {[
              { id: 'tasks', label: 'Task Execution' },
              { id: 'agents', label: 'Active Agents' },
              { id: 'activity', label: 'Activity Logs' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 border-b-2 font-semibold text-xs tracking-wider uppercase transition-colors ${activeTab === tab.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'tasks' && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-white">Execution Stream ({tasks.length})</h3>
                  <button onClick={handleAddTask} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider">
                    <Plus size={14} /> Add Task
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <div className="p-8 border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center text-center">
                    <CheckCircle size={32} className="text-zinc-700 mb-3" />
                    <p className="text-zinc-500 text-sm">No tasks programmed in this execution container.</p>
                    <button onClick={handleAddTask} className="mt-4 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-500/20 transition">Start by adding one</button>
                  </div>
                ) : (
                  tasks.map((task: any) => (
                    <div key={task.id} className="p-4 rounded-xl border border-white/[0.03] bg-[#0a0a0b] flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : task.status === 'in-progress' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>
                          {task.status === 'completed' ? <CheckCircle size={14} /> : task.status === 'blocked' ? <ShieldAlert size={14} className="text-rose-400" /> : <TerminalSquare size={14} />}
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm">{task.title}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-1">ID: {task.id} • Assigned: {task.assigned_agent || 'None'}</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-black border border-white/5 text-zinc-400">
                        {task.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {activeTab === 'agents' && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-white mb-4">Agents Linked ({project.derived_agents?.length || 0})</h3>
                {project.derived_agents?.length > 0 ? project.derived_agents.map((ag: string) => (
                  <div key={ag} className="p-4 rounded-xl border border-white/[0.03] bg-[#0a0a0b] flex items-center gap-4">
                    <Users className="text-indigo-400" size={18} />
                    <span className="font-medium text-sm text-white">{ag}</span>
                  </div>
                )) : <p className="text-zinc-500 text-xs italic">No agents active on this container.</p>}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="flex flex-col gap-0 border-l border-white/10 ml-4 pl-4 py-2">
                {(project.project_activity || []).map((act: any) => (
                  <div key={act.id} className="relative pb-6 last:pb-0">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500/50 border-2 border-[#0f0f12]"></span>
                    <p className="text-sm text-zinc-300">{act.message}</p>
                    <span className="text-[10px] text-zinc-500 font-mono">{new Date(act.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Content (Control Surface) */}
        <div className="w-80 bg-[#0a0a0b] p-8 flex flex-col gap-10 overflow-y-auto">
           
           <section>
             <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">System Actions</h4>
             <div className="flex flex-col gap-2">
                <button onClick={() => handleAction('start')} className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors group">
                  <span className="text-xs font-bold tracking-wider uppercase">Sprint Execution</span>
                  <Play size={14} className="group-hover:scale-110 transition-transform" />
                </button>
                <button onClick={() => handleAction('pause')} className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors group">
                  <span className="text-xs font-bold tracking-wider uppercase">Halt Execution</span>
                  <Pause size={14} className="group-hover:scale-110 transition-transform" />
                </button>
                <button onClick={() => handleAction('auto')} className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors group border ${project.automation_enabled ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 border-white/5'}`}>
                  <span className="text-xs font-bold tracking-wider uppercase">Autonomous Mode</span>
                  <Zap size={14} className={`group-hover:scale-110 transition-transform ${project.automation_enabled ? 'animate-pulse' : ''}`} fill={project.automation_enabled ? 'currentColor' : 'none'} />
                </button>
             </div>
           </section>

           <section>
             <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Telemetrics</h4>
             <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center p-4 rounded-xl border border-white/[0.03] bg-black/40">
                  <span className="text-xs text-zinc-400">Health Status</span>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${getHealthColor(project?.health)}`}>
                     {project?.health || 'HEALTHY'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl border border-white/[0.03] bg-black/40">
                  <span className="text-xs text-zinc-400">Task Choke</span>
                  <span className="text-xs font-mono text-zinc-300">{tasks.filter((t:any) => t.status === 'blocked').length} / {tasks.length}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl border border-white/[0.03] bg-black/40">
                  <span className="text-xs text-zinc-400">Creation</span>
                  <span className="text-xs font-mono text-zinc-500">{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
             </div>
           </section>

        </div>

      </div>
    </div>
  );
}
