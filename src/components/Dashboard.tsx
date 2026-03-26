'use client';
import Image from 'next/image';

import React, { useState, useEffect } from 'react';
import { useDashboard, useLiveMissionControl } from '@/hooks/useMissionControl';
import { 
  Activity, AlertTriangle, CheckCircle, Database, Layers,
  ShieldAlert, Cpu, Settings, LayoutDashboard, Users, 
  FolderKanban, CheckSquare, TerminalSquare, Command,
  Target, Zap, Bell, BrainCircuit, ChevronDown, Fingerprint
} from 'lucide-react';
import { ProjectsView } from './ProjectsView';
import { AgentsView } from './AgentsView';
import { AgentSettingsView } from './agent-settings/AgentSettingsView';
import { TasksView } from './TasksView';
import { TelemetryView } from './TelemetryView';
import { FilesystemView } from './FilesystemView';
import { ObjectivesView } from './ObjectivesView';
import { AlertsView } from './AlertsView';
import { AutomationsView } from './AutomationsView';
import { RoutinesView } from './RoutinesView';
import { CommandBar } from './CommandBar';
import { FactoryPipeline } from './factory/FactoryPipeline';
import { KnowledgeView } from './KnowledgeView';
import { SpendIntelligenceView } from './spend/SpendIntelligenceView';
import { WorkspacesView } from './workspaces/WorkspacesView';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@contracts';

const Card = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <div className={`bg-[#0f0f11] border border-white/[0.04] rounded-2xl shadow-2xl p-6 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, colorClass }: { children?: React.ReactNode; colorClass?: string }) => (
  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md ${colorClass}`}>
    {children}
  </span>
);

const NavItem = ({ icon: Icon, label, active, onClick, href }: { icon: any; label: string; active?: boolean; onClick?: () => void; href?: string }) => {
  const content = (
    <>
      <Icon size={16} className={active ? 'text-indigo-400' : 'text-zinc-500'} />
      {label}
    </>
  );
  const className = `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-xs font-semibold tracking-wider uppercase focus:outline-none focus:ring-0 ${
    active 
      ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-white/[0.05]' 
      : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 border border-transparent'
  }`;

  if (href) {
    return <a href={href} className={className}>{content}</a>;
  }
  return <button onClick={onClick} className={className}>{content}</button>;
};

const VALID_VIEWS = [
  'dashboard', 'projects', 'agents', 'agent-settings', 'tasks', 'pipeline', 'objectives',
  'alerts', 'routines', 'automations', 'telemetry', 'filesystem', 'settings', 'knowledge', 'spend', 'workspaces'
];

const getInitialView = () => {
  return 'dashboard';
};

export const Dashboard = () => {
  const [activeView, setActiveViewState] = useState(getInitialView);
  const [commandOpen, setCommandOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspaceState] = useState('business');
  const [workspaceSelectOpen, setWorkspaceSelectOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jarvis_workspace');
      if (saved) setActiveWorkspaceState(saved);
    }
  }, []);

  const setActiveWorkspace = (ws: string) => {
    setActiveWorkspaceState(ws);
    if (typeof window !== 'undefined') localStorage.setItem('jarvis_workspace', ws);
  };

  const setActiveView = (view: string) => {
    setActiveViewState(view);
    window.location.hash = view;
  };

  // Sync if user navigates with browser back/forward and set initial mount hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      const view = hash.split('?')[0];
      if (VALID_VIEWS.includes(view)) {
        setActiveViewState(view);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);
  // React Query & SSE Hook setup
  useLiveMissionControl(activeWorkspace);
  const { data: dashboardData, isLoading, isError } = useDashboard(activeWorkspace);

  // Fallback defaults to match legacy structures while loading
  const data = dashboardData || {
    agents: [], tasks: [], activity: [], projects: [], messages: [],
    system_state: { status: 'NORMAL', active_agents: 0, pending_tasks: 0, blocked_tasks: 0 },
    objectives: [], phases: [], alerts: [], agent_memory: [], automation_rules: [], global_lists: []
  };

  // Re-map telemetry to activity to preserve sub-component compat
  if (dashboardData?.telemetry?.events) {
    data.activity = dashboardData.telemetry.events;
  }
  
  useEffect(() => {
    // Engine loop can stay but we rely on SSE for live updates
    const engineInterval = setInterval(async () => {
      try { await fetch(`/api/engine?workspace=${activeWorkspace}`, { method: 'POST' }); } catch (e) {}
    }, 5000);
    return () => clearInterval(engineInterval);
  }, [activeWorkspace]);

  const activeAgents = (data.agents || []).filter((a: Agent) => a.status === 'active').length;
  const activeProjects = (data.projects || []).filter((p: Project) => p.progress > 0 && p.progress < 100).length;
  const pendingTasks = (data.tasks || []).filter((t: Task) => t.status === 'pending').length;
  
  const systemState = data.system_state || { status: 'NORMAL' };
  const getStatusColor = (status: string) => {
    if (status === 'NORMAL') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'IDLE') return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    if (status === 'OVERLOADED') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    if (status === 'BLOCKED') return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  };

  const activeAlerts = (data.alerts || []).filter((a: Agent) => a.status === 'ACTIVE');

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-300 font-sans tracking-tight overflow-hidden">
      
      {/* COMMAND LAYER */}
      <CommandBar 
        isOpen={commandOpen} 
        onClose={() => setCommandOpen(false)} 
        onExecute={() => {}} 
      />

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#0a0a0b] border-r border-white/[0.04] flex flex-col z-20 shrink-0">
        <div className="h-20 flex items-center px-5 border-b border-white/[0.04]">
          <div className="relative flex items-center justify-center shrink-0 w-12 h-12 ml-[2px] mr-3">
            <Image src="https://i.gifer.com/origin/43/434771e3bf841e79abb2d4da70d6b1e2.gif" alt="JARVIS" className="w-[90px] h-[90px] max-w-none object-cover mix-blend-screen relative z-10" width={90} height={90} unoptimized />
          </div>
          <div className="flex flex-col justify-center relative z-20 ml-[5px]">
            <h1 className="text-[17px] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-500 tracking-[0.2em] leading-none mb-[2px]">JARVIS</h1>
            <div className="relative">
              <button 
                onClick={() => setWorkspaceSelectOpen(!workspaceSelectOpen)}
                className="focus:outline-none focus:ring-0 flex items-center gap-1 opacity-90 hover:opacity-100 transition-opacity group cursor-pointer"
              >
                <div className={`w-1 h-1 rounded-full animate-pulse ${activeWorkspace === 'business' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></div>
                <span className={`text-[9px] uppercase tracking-[0.25em] font-bold ${activeWorkspace === 'business' ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {activeWorkspace}
                </span>
                <ChevronDown size={10} className={`${activeWorkspace === 'business' ? 'text-blue-500/70 group-hover:text-blue-400' : 'text-emerald-500/70 group-hover:text-emerald-400'} transition-colors ml-0.5`} />
              </button>
              
              {workspaceSelectOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setWorkspaceSelectOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-3 w-48 bg-[#0a0a0b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1 backdrop-blur-3xl">
                    <div className="px-4 py-2 text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                      Select Workspace
                    </div>
                    <button 
                      className={`focus:outline-none focus:ring-0 w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-semibold transition-colors hover:bg-white/[0.04] ${activeWorkspace === 'business' ? 'text-white bg-white/[0.02]' : 'text-zinc-400'}`}
                      onClick={() => { setActiveWorkspace('business'); setWorkspaceSelectOpen(false); }}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeWorkspace === 'business' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-transparent border border-white/20'}`}></div>
                      Business
                    </button>
                    <button 
                      className={`focus:outline-none focus:ring-0 w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-semibold transition-colors hover:bg-white/[0.04] ${activeWorkspace === 'personal' ? 'text-white bg-white/[0.02]' : 'text-zinc-400'}`}
                      onClick={() => { setActiveWorkspace('personal'); setWorkspaceSelectOpen(false); }}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeWorkspace === 'personal' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-transparent border border-white/20'}`}></div>
                      Personal
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
          <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-4 mb-2">Systems</div>
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
          <NavItem icon={FolderKanban} label="Projects" active={activeView === 'projects'} onClick={() => setActiveView('projects')} />
          <NavItem icon={Users} label="Agents" active={activeView === 'agents' || activeView === 'agent-settings' || activeView === 'spend'} onClick={() => setActiveView('agents')} />
          { (activeView === 'agents' || activeView === 'agent-settings' || activeView === 'spend') && (
            <div className="pl-11 pr-4 mt-1 space-y-1 mb-2 flex flex-col gap-1">
              <button onClick={() => setActiveView('agent-settings')} className={`focus:outline-none focus:ring-0 text-[10px] uppercase font-bold tracking-widest w-full text-left py-1.5 px-3 rounded-lg transition-colors border ${activeView === 'agent-settings' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-inner' : 'text-zinc-500 border-transparent hover:bg-white/[0.04] hover:text-zinc-300'}`}>Settings</button>
              <button onClick={() => setActiveView('spend')} className={`focus:outline-none focus:ring-0 text-[10px] uppercase font-bold tracking-widest w-full text-left py-1.5 px-3 rounded-lg transition-colors border ${activeView === 'spend' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-inner' : 'text-zinc-500 border-transparent hover:bg-white/[0.04] hover:text-zinc-300'}`}>Spend</button>
            </div>
          )}
          <NavItem icon={Fingerprint} label="Identity" active={activeView === 'workspaces'} onClick={() => setActiveView('workspaces')} />
          <NavItem icon={CheckSquare} label="Tasks" active={activeView === 'tasks'} onClick={() => setActiveView('tasks')} />
          <NavItem icon={Layers} label="Dev Pipeline" active={activeView === 'pipeline'} onClick={() => setActiveView('pipeline')} />
          
          <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-4 mt-6 mb-2">Strategy & Command</div>
          <NavItem icon={Target} label="Objectives" active={activeView === 'objectives'} onClick={() => setActiveView('objectives')} />
          <NavItem icon={BrainCircuit} label="Knowledge" active={activeView === 'knowledge'} onClick={() => setActiveView('knowledge')} />
          
          <NavItem icon={Bell} label="Alerts" active={activeView === 'alerts'} onClick={() => setActiveView('alerts')} />
          <NavItem icon={Activity} label="Routines" active={activeView === 'routines'} onClick={() => setActiveView('routines')} />
          <NavItem icon={Zap} label="Automations" active={activeView === 'automations'} onClick={() => setActiveView('automations')} />
          
          <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-4 mt-6 mb-2">Observability</div>
          <NavItem icon={TerminalSquare} label="Telemetry" active={activeView === 'telemetry'} onClick={() => setActiveView('telemetry')} />
          <NavItem icon={Database} label="Filesystem" active={activeView === 'filesystem'} onClick={() => setActiveView('filesystem')} />
        </nav>

        <div className="p-4 border-t border-white/[0.04]">
          <NavItem icon={Settings} label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        
        {/* LOADER */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <span className="w-8 h-8 rounded-full border-4 border-white/10 border-t-indigo-500 animate-spin"></span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold animate-pulse">Initializing Mission Control...</span>
            </div>
          </div>
        )}

        {/* HEADER */}
        <header className="h-20 border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-10 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Command size={16} className="text-zinc-600" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-semibold">
              <span className="text-white mr-1">Welcome back, Roy</span> / {activeView}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors mr-2 cursor-text"
            >
              <Command size={14} />
              <span className="text-[10px] uppercase font-bold tracking-widest">Command ⌘ K</span>
            </button>
          
            <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-widest flex items-center gap-2 ${getStatusColor(systemState.status)}`}>
               <div className={`w-1.5 h-1.5 rounded-full ${systemState.status !== 'NORMAL' ? 'animate-pulse bg-current' : 'bg-current'}`}></div>
               SYS: {systemState.status}
            </div>

            <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-widest flex items-center gap-2 ${data.meta?.memory?.count > 0 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20'}`}>
               <BrainCircuit size={12} />
               MEM: {data.meta?.memory?.count || 0} DOCS
            </div>

            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#0f0f12] border border-white/5 shadow-inner">
               <div className="flex items-center gap-1.5">
                  <FolderKanban size={12} className="text-indigo-400" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Active: <span className="text-white">{activeProjects}</span></span>
               </div>
               <div className="w-px h-3 bg-white/10"></div>
               <div className="flex items-center gap-1.5">
                  <AlertTriangle size={12} className={systemState.blocked_tasks > 0 ? "text-rose-400" : "text-zinc-600"} />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Blocked: <span className={systemState.blocked_tasks > 0 ? "text-rose-400" : "text-white"}>{systemState.blocked_tasks || 0}</span></span>
               </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.05]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></span>
              <span className="text-emerald-400 text-[9px] uppercase font-mono font-bold tracking-[0.1em]">Engine Pulse (5s)</span>
            </div>
          </div>
        </header>

        {/* CONTENT SWITCHER */}
        <div className={`p-8 mx-auto w-full pb-20 ${['tasks', 'objectives', 'projects', 'knowledge'].includes(activeView) ? 'max-w-none' : 'max-w-[1600px]'}`}>
          {activeView === 'dashboard' && (
            <div className="grid grid-cols-12 gap-6 animate-in fade-in duration-500">
              {/* TOP LEVEL METRICS */}
              <div className="col-span-12 grid grid-cols-4 gap-6">
                <Card className="relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Layers size={64} className="text-zinc-400" />
                  </div>
                  <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-3">Active Projects</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-light text-white tracking-tight">{activeProjects}</span>
                    <span className="text-sm text-zinc-500">/ {(data.projects || []).length}</span>
                  </div>
                </Card>
                
                <Card className="relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={64} className="text-emerald-400" />
                  </div>
                  <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-3">Agent Utilization</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-light text-white tracking-tight">{activeAgents}</span>
                    <span className="text-sm text-zinc-500">/ {(data.agents || []).length} online</span>
                  </div>
                </Card>

                <Card className="relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertTriangle size={64} className="text-amber-400" />
                  </div>
                  <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-3">Pending Tasks</h3>
                  <div className="flex justify-between items-baseline">
                    <span className="text-4xl font-light text-amber-400 tracking-tight">{pendingTasks}</span>
                  </div>
                </Card>

                <Card className="relative overflow-hidden group border-rose-500/20 bg-gradient-to-br from-rose-500/[0.03] to-transparent cursor-pointer" onClick={() => setActiveView('alerts')}>
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Bell size={64} className="text-rose-400" />
                  </div>
                  <h3 className="text-rose-500/70 text-[10px] uppercase tracking-widest font-semibold mb-3">Active Alerts</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-light text-rose-400 tracking-tight">{activeAlerts.length}</span>
                    <span className="text-sm text-zinc-500">critical issues</span>
                  </div>
                </Card>
              </div>

              {/* LEFT COLUMN */}
              <div className="col-span-8 flex flex-col gap-8">
                
                <section>
                  <div className="flex justify-between items-center mb-5">
                    <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.15em]">Strategic Objectives</h2>
                    <button className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300" onClick={() => setActiveView('objectives')}>View All</button>
                  </div>
                  <div className="flex flex-col gap-4">
                    {(data.objectives || []).slice(0, 2).map((obj: Objective) => (
                      <Card key={obj.id} className="p-4 border-amber-500/10 cursor-pointer hover:border-amber-500/20 transition-colors" onClick={() => setActiveView('objectives')}>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-white font-medium text-sm flex items-center gap-2">
                            <Target size={14} className="text-amber-400" /> {obj.title}
                          </h4>
                          <Badge colorClass={obj.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : obj.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-400'}>{obj.status?.replace('_', ' ')}</Badge>
                        </div>
                        <div className="w-full bg-black h-1.5 rounded-full overflow-hidden border border-white/5 mb-2">
                          <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all" style={{ width: `${obj.progress || 0}%` }}></div>
                        </div>
                        {obj.current_phase && (
                          <div className="text-[10px] text-amber-500/70 font-mono uppercase tracking-wider">► {obj.current_phase}</div>
                        )}
                      </Card>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="flex justify-between items-center mb-5">
                    <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.15em]">Live Execution Roster</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(data.agents || []).map((agent: Agent) => (
                      <Card key={agent.id} className="p-4 hover:bg-white/[0.02] transition-colors border border-white/[0.03]">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                              {agent.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0f0f11] ${agent.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                              <h4 className="text-sm font-medium text-zinc-100 truncate">{agent.name}</h4>
                              <span className="text-[10px] text-zinc-500 font-mono">ID: {agent.id}</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 mb-1">{agent.role}</p>
                            <p className="text-xs text-zinc-300 truncate font-mono bg-black/40 px-2 py-1 rounded border border-white/5">{agent.current_task || 'Idle'}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN */}
              <div className="col-span-4 flex flex-col gap-6">
                <section>
                  <div className="flex justify-between items-center mb-5">
                    <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.15em]">System Alerts</h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {activeAlerts.length === 0 ? (
                       <div className="text-xs text-zinc-500 italic px-2 py-4 border border-white/5 border-dashed rounded-xl text-center">System Nominal.</div>
                    ) : activeAlerts.slice(0, 4).map((alert: Alert) => (
                      <div key={alert.id} className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] flex items-start gap-3">
                         <ShieldAlert size={14} className="text-rose-500 mt-0.5 shrink-0" />
                         <div className="flex-1">
                           <h4 className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">{alert.type}</h4>
                           <p className="text-xs text-zinc-400 line-clamp-2">{alert.message}</p>
                         </div>
                      </div>
                    ))}
                  </div>
                </section>
                
                <section>
                  <div className="flex justify-between items-center mb-5">
                    <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.15em]">Execution Queue</h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {(data.tasks || []).map((task: Task) => (
                      <Card key={task.id} className={`p-4 relative overflow-hidden ${task.priority === 'critical' ? 'border-amber-500/30 bg-amber-500/[0.02]' : 'border-white/[0.03]'}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {task.status === 'completed' ? <CheckCircle size={14} className="text-emerald-400" /> : <AlertTriangle size={14} className="text-amber-400" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-zinc-200 text-sm font-medium mb-1">{task.title}</h4>
                            <div className="flex justify-between items-center mt-2">
                              <Badge colorClass="bg-black border border-white/10 text-zinc-400">{task.assigned_agent}</Badge>
                              <span className="text-[10px] text-zinc-600 font-mono">{task.status}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* PHASE 3 VIEWS */}
          {activeView === 'projects' && <ProjectsView activeWorkspace={activeWorkspace} />}
          {activeView === 'agents' && <AgentsView agents={data.agents} activeWorkspace={activeWorkspace} />}
          {activeView === 'agent-settings' && <AgentSettingsView agents={data.agents} activeWorkspace={activeWorkspace} />}
          {activeView === 'tasks' && <TasksView tasks={data.tasks} projects={data.projects} globalLists={data.global_lists} activeWorkspace={activeWorkspace} />}
          {activeView === 'pipeline' && (
            <div className="absolute inset-0 bg-[#0a0f18] z-50 overflow-y-auto">
              <FactoryPipeline activeWorkspace={activeWorkspace} />
            </div>
          )}
          {activeView === 'telemetry' && <TelemetryView activity={data.activity} activeWorkspace={activeWorkspace} />}
          {activeView === 'filesystem' && <FilesystemView activeWorkspace={activeWorkspace} />}
          {activeView === 'objectives' && <ObjectivesView objectives={data.objectives} projects={data.projects} activeWorkspace={activeWorkspace} />}
          {activeView === 'alerts' && <AlertsView alerts={data.alerts} activeWorkspace={activeWorkspace} />}
          {activeView === 'routines' && <RoutinesView activeWorkspace={activeWorkspace} />}
          {activeView === 'automations' && <AutomationsView rules={data.automation_rules} activeWorkspace={activeWorkspace} />}
          {activeView === 'knowledge' && <KnowledgeView activeWorkspace={activeWorkspace} />}
          {activeView === 'spend' && <SpendIntelligenceView activeWorkspace={activeWorkspace} />}
          {activeView === 'workspaces' && (
            <div className="absolute inset-0 top-20 z-40 bg-[#0a0a0a]">
              <WorkspacesView activeWorkspace={activeWorkspace} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};