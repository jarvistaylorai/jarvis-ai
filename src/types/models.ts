export type SystemMode = 'autonomous' | 'manual' | 'maintenance' | 'restricted';
export type HealthStatus = 'operational' | 'degraded' | 'critical';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type TaskType = 'approval' | 'blocker' | 'action' | 'review';
export type AgentState = 'active' | 'idle' | 'paused' | 'failed';
export type ProjectStage = 'planning' | 'development' | 'testing' | 'live';
export type SprintStatus = 'on-track' | 'at-risk' | 'blocked';

export interface SystemStatus {
  mode: SystemMode;
  activeSprint: string;
  focusProject: string;
  status: HealthStatus;
  lastSync: Date;
  activeAgentsCount: number;
  totalAgentsCount: number;
  activeProjectsCount: number;
  blockedProjectsCount: number;
  pendingApprovalsCount: number;
  highRiskApprovalsCount: number;
  systemHealthScore: number;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  priority: PriorityLevel;
  type: TaskType;
  assignedTo: string;
  dueDate?: Date;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentState;
  currentTask: string;
  uptimeScore: number;
  tasksCompleted: number;
  lastActivity: Date;
  avatarUrl?: string; // photo requirement
}

export interface Project {
  id: string;
  name: string;
  stage: ProjectStage;
  sprintStatus: SprintStatus;
  progress: number;
  nextMilestone: string;
  dueDate: Date;
  blockersCount: number;
  assignedAgents: string[];
}

export interface ActivityEvent {
  id: string;
  agentId: string;
  agentName: string;
  status: 'success' | 'in-progress' | 'failed';
  task: string;
  outputSummary: string;
  timestamp: Date;
}