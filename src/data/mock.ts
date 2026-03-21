import { SystemStatus, Task, Agent, Project, ActivityEvent } from '../types/models';

export const mockSystemStatus: SystemStatus = {
  mode: 'autonomous',
  activeSprint: 'Sprint 14 - Q1 2026',
  focusProject: 'Jarvis AI',
  status: 'operational',
  lastSync: new Date(),
  activeAgentsCount: 5,
  totalAgentsCount: 6,
  activeProjectsCount: 4,
  blockedProjectsCount: 0,
  pendingApprovalsCount: 1,
  highRiskApprovalsCount: 0,
  systemHealthScore: 98,
};

export const priorityQueue: Task[] = [
  { id: '1', title: 'Approve Production Deploy', project: 'AssetOSX', priority: 'critical', type: 'approval', assignedTo: 'Roy Taylor' },
  { id: '2', title: 'Finalize UX Wireframes', project: 'Medellin Social Club', priority: 'high', type: 'action', assignedTo: 'UX Agent' },
  { id: '3', title: 'DB Schema Review', project: 'Mentorship Platform', priority: 'medium', type: 'review', assignedTo: 'Dev Agent' }
];

export const agents: Agent[] = [
  { id: '1', name: 'Dev Agent', role: 'Software Engineering', status: 'active', currentTask: 'Compiling core services', uptimeScore: 99.8, tasksCompleted: 142, lastActivity: new Date(), avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80' },
  { id: '2', name: 'UX Agent', role: 'Product Design', status: 'active', currentTask: 'Drafting mobile wireframes', uptimeScore: 99.9, tasksCompleted: 84, lastActivity: new Date(), avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80' },
  { id: '3', name: 'QA Agent', role: 'Quality Assurance', status: 'idle', currentTask: 'Standing by for review', uptimeScore: 99.5, tasksCompleted: 211, lastActivity: new Date(Date.now() - 500000), avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80' },
  { id: '4', name: 'DevOps Agent', role: 'Infrastructure', status: 'active', currentTask: 'Monitoring deployment health', uptimeScore: 100, tasksCompleted: 45, lastActivity: new Date(), avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80' },
  { id: '5', name: 'Chief of Staff', role: 'Orchestration', status: 'active', currentTask: 'Routing project tasks', uptimeScore: 100, tasksCompleted: 350, lastActivity: new Date(), avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&q=80' }
];

export const projects: Project[] = [
  { id: 'p1', name: 'Jarvis AI', stage: 'development', sprintStatus: 'on-track', progress: 85, nextMilestone: 'Dashboard V1', dueDate: new Date(), blockersCount: 0, assignedAgents: ['Dev Agent', 'UX Agent'] },
  { id: 'p2', name: 'AssetOSX', stage: 'testing', sprintStatus: 'on-track', progress: 95, nextMilestone: 'Security Audit', dueDate: new Date(), blockersCount: 0, assignedAgents: ['QA Agent'] },
  { id: 'p3', name: 'Medellin Social', stage: 'planning', sprintStatus: 'on-track', progress: 15, nextMilestone: 'PRD Finalization', dueDate: new Date(), blockersCount: 0, assignedAgents: ['UX Agent'] }
];

export const activityFeed: ActivityEvent[] = [
  { id: 'a1', agentId: 'dev1', agentName: 'Dev Agent', status: 'success', task: 'Compile frontend assets', outputSummary: 'Build successful in 2.4s', timestamp: new Date() },
  { id: 'a2', agentId: 'ux1', agentName: 'UX Agent', status: 'success', task: 'Generate wireframe vectors', outputSummary: 'Exported 12 artboards', timestamp: new Date(Date.now() - 120000) },
  { id: 'a3', agentId: 'ops1', agentName: 'DevOps Agent', status: 'in-progress', task: 'Health check ping', outputSummary: 'All services nominal', timestamp: new Date(Date.now() - 300000) }
];