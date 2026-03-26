/**
 * Mission Control Data Contracts
 * These interfaces define the canonical data model shared between the Mission Control UI,
 * the orchestration engine (Jarvis), and backing services (Postgres/Supabase, OpenClaw agents).
 */

export type UUID = string;
export type ISODateString = string; // ISO 8601 timestamps for cross-system compatibility

export enum AgentStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  ERROR = 'error',
  OFFLINE = 'offline'
}

export enum AgentKind {
  HUMAN = 'human',
  AUTONOMOUS = 'autonomous',
  SERVICE = 'service'
}

export enum TaskStatus {
  IDEAS = 'ideas',
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  UNDER_REVIEW = 'under_review',
  BLOCKED = 'blocked',
  COMPLETED = 'completed'
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TaskType {
  ACTION = 'action',
  APPROVAL = 'approval',
  RESEARCH = 'research',
  MAINTENANCE = 'maintenance'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved'
}

export enum TelemetryCategory {
  HEARTBEAT = 'heartbeat',
  LOG = 'log',
  METRIC = 'metric',
  EVENT = 'event',
  ERROR = 'error'
}

export enum TelemetrySeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export enum ObjectiveStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed'
}

export enum ObjectivePriority {
  MISSION_CRITICAL = 'mission_critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum ProjectStatus {
  PLANNED = 'planned',
  BUILDING = 'building',
  TESTING = 'testing',
  LAUNCHED = 'launched',
  PAUSED = 'paused'
}

export interface BaseEntity {
  id: UUID;
  workspace_id: UUID;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Project extends BaseEntity {
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ObjectivePriority;
  owner_agent_id?: UUID; // FK -> agents.id
  health_score: number; // 0-100 signal for observability
  progress_percent: number; // derived from tasks/objectives
  start_date?: ISODateString;
  due_date?: ISODateString;
  active_sprint?: string;
  objective_ids: UUID[]; // FK -> objectives.id
  tags: string[];
  metadata?: Record<string, any>;
}

export interface Agent extends BaseEntity {
  name: string;
  handle: string; // human-friendly slug (e.g., "dev_agent")
  kind: AgentKind;
  status: AgentStatus;
  role: string;
  capability_tags: string[];
  assigned_workspace_ids: UUID[];
  current_task_id?: UUID; // FK -> tasks.id
  current_project_id?: UUID; // FK -> projects.id
  current_channel?: string; // e.g., OpenClaw session key
  utilization_percent: number; // rolling 24h utilization
  tasks_completed_24h: number;
  last_heartbeat_at?: ISODateString;
  error_state?: string;
  metadata?: Record<string, any>;
}

export interface Task extends BaseEntity {
  project_id?: UUID; // FK -> projects.id
  parent_task_id?: UUID; // FK -> tasks.id (hierarchical)
  objective_id?: UUID; // FK -> objectives.id
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  assigned_agent_id?: UUID; // FK -> agents.id
  requested_by_agent_id?: UUID; // FK -> agents.id
  due_at?: ISODateString;
  started_at?: ISODateString;
  completed_at?: ISODateString;
  blocked_reason?: string;
  dependency_ids: UUID[]; // FK -> tasks.id
  tags: string[];
  auto_execute: boolean;
  history_cursor?: string; // reference into telemetry/log store
  metadata?: Record<string, any>;
}

export interface Alert extends BaseEntity {
  source_type: 'system' | 'task' | 'agent' | 'project' | 'objective';
  source_id?: UUID;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  acknowledged_by_agent_id?: UUID;
  acknowledged_at?: ISODateString;
  resolved_at?: ISODateString;
  context?: Record<string, any>;
}

export interface TelemetryEvent extends BaseEntity {
  agent_id?: UUID; // FK -> agents.id
  task_id?: UUID; // FK -> tasks.id
  project_id?: UUID; // FK -> projects.id
  category: TelemetryCategory;
  severity: TelemetrySeverity;
  event_type: string; // e.g., "task.assigned"
  message: string;
  payload?: Record<string, any>;
  latency_ms?: number;
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
  correlation_id?: string;
}

export interface Objective extends BaseEntity {
  project_id?: UUID; // FK -> projects.id
  parent_objective_id?: UUID; // FK -> objectives.id
  title: string;
  description?: string;
  status: ObjectiveStatus;
  priority: ObjectivePriority;
  progress_percent: number;
  owner_agent_id?: UUID; // FK -> agents.id
  target_date?: ISODateString;
  current_phase?: string;
  key_results: Array<{
    id: UUID;
    title: string;
    metric_name?: string;
    metric_target?: number;
    metric_unit?: string;
    current_value?: number;
  }>;
  metadata?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  next_cursor?: string;
}
