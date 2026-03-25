-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE agent_status AS ENUM ('idle', 'active', 'error', 'offline');
CREATE TYPE agent_kind AS ENUM ('human', 'autonomous', 'service');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'blocked', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE task_type AS ENUM ('action', 'approval', 'research', 'maintenance');
CREATE TYPE project_status AS ENUM ('planned', 'building', 'testing', 'launched', 'paused');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');
CREATE TYPE telemetry_category AS ENUM ('heartbeat', 'log', 'metric', 'event', 'error');
CREATE TYPE telemetry_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE objective_status AS ENUM ('not_started', 'in_progress', 'blocked', 'completed');
CREATE TYPE objective_priority AS ENUM ('mission_critical', 'high', 'medium', 'low');

-- ==========================================
-- 2. UTILITY FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION prevent_telemetry_mutations()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Telemetry events are append-only. Updates and deletes are forbidden.';
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION trigger_alert_on_critical_telemetry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.severity = 'critical' THEN
        INSERT INTO alerts (workspace_id, source_type, source_id, message, severity, status, context)
        VALUES (
            NEW.workspace_id,
            'agent',
            NEW.agent_id,
            'Critical event triggered: ' || NEW.message,
            'critical',
            'active',
            jsonb_build_object('event_type', NEW.event_type, 'telemetry_id', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 3. TABLES
-- ==========================================

-- AGENTS
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    kind agent_kind NOT NULL DEFAULT 'autonomous',
    status agent_status NOT NULL DEFAULT 'idle',
    role TEXT NOT NULL,
    capability_tags TEXT[] DEFAULT '{}',
    assigned_workspace_ids UUID[] DEFAULT '{}',
    utilization_percent INTEGER DEFAULT 0 CHECK (utilization_percent >= 0 AND utilization_percent <= 100),
    tasks_completed_24h INTEGER DEFAULT 0,
    current_task_id UUID,
    current_project_id UUID,
    current_channel TEXT,
    last_heartbeat_at TIMESTAMPTZ,
    error_state TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROJECTS
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'planned',
    priority objective_priority NOT NULL DEFAULT 'medium',
    owner_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    health_score INTEGER NOT NULL DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    start_date TIMESTAMPTZ DEFAULT now(),
    due_date TIMESTAMPTZ,
    active_sprint TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OBJECTIVES
CREATE TABLE objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    parent_objective_id UUID REFERENCES objectives(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status objective_status NOT NULL DEFAULT 'not_started',
    priority objective_priority NOT NULL DEFAULT 'medium',
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    owner_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    target_date TIMESTAMPTZ,
    current_phase TEXT,
    key_results JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TASKS
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    objective_id UUID REFERENCES objectives(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'pending',
    priority task_priority NOT NULL DEFAULT 'normal',
    type task_type NOT NULL DEFAULT 'action',
    assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    requested_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    due_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    blocked_reason TEXT,
    dependency_ids UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    auto_execute BOOLEAN NOT NULL DEFAULT false,
    history_cursor TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ALERTS
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('system', 'task', 'agent', 'project', 'objective')),
    source_id UUID,
    message TEXT NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'info',
    status alert_status NOT NULL DEFAULT 'active',
    acknowledged_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TELEMETRY EVENTS
CREATE TABLE telemetry_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    category telemetry_category NOT NULL DEFAULT 'event',
    severity telemetry_severity NOT NULL DEFAULT 'info',
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    latency_ms INTEGER,
    tokens_input INTEGER,
    tokens_output INTEGER,
    cost_usd NUMERIC(10, 6),
    correlation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 4. TRIGGERS
-- ==========================================

-- Auto-update updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_objectives_updated_at BEFORE UPDATE ON objectives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enforce append-only on telemetry_events
CREATE TRIGGER enforce_telemetry_append_only
BEFORE UPDATE OR DELETE ON telemetry_events
FOR EACH ROW EXECUTE FUNCTION prevent_telemetry_mutations();

-- Auto-alert on critical telemetry
CREATE TRIGGER alert_on_critical_event
AFTER INSERT ON telemetry_events
FOR EACH ROW EXECUTE FUNCTION trigger_alert_on_critical_telemetry();

-- ==========================================
-- 5. INDEXES (For Scale & Real-Time)
-- ==========================================
CREATE INDEX idx_agents_workspace ON agents(workspace_id, status);
CREATE INDEX idx_projects_workspace ON projects(workspace_id, status, priority);
CREATE INDEX idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX idx_tasks_agent_assigned ON tasks(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX idx_alerts_workspace_active ON alerts(workspace_id, status) WHERE status = 'active';
CREATE INDEX idx_telemetry_workspace_time ON telemetry_events(workspace_id, created_at DESC);
CREATE INDEX idx_telemetry_agent_time ON telemetry_events(agent_id, created_at DESC);
CREATE INDEX idx_telemetry_correlation ON telemetry_events(correlation_id) WHERE correlation_id IS NOT NULL;

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- Allow full access to authenticated users and service roles for the workspace
-- (Assuming a simplistic approach where if you have the anon/service key, you can access your workspace)
CREATE POLICY "Allow full access for authenticated" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for authenticated" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for authenticated" ON objectives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for authenticated" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for authenticated" ON alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for authenticated" ON telemetry_events FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 7. SEED DATA (Minimal Real Data)
-- ==========================================
DO $$
DECLARE
    ws_id UUID := uuid_generate_v4();
    roy_id UUID := uuid_generate_v4();
    jarvis_id UUID := uuid_generate_v4();
    proj_id UUID := uuid_generate_v4();
    task_id UUID := uuid_generate_v4();
BEGIN
    -- Insert Agents
    INSERT INTO agents (id, workspace_id, name, handle, kind, status, role, capability_tags)
    VALUES 
        (roy_id, ws_id, 'Roy Taylor', 'roy', 'human', 'active', 'Founder & Operator', ARRAY['strategy', 'approval', 'architecture']),
        (jarvis_id, ws_id, 'Jarvis', 'jarvis', 'autonomous', 'active', 'Orchestrator & Exec Layer', ARRAY['orchestration', 'code_generation', 'deployment']);

    -- Insert Project
    INSERT INTO projects (id, workspace_id, name, description, status, priority, owner_agent_id)
    VALUES 
        (proj_id, ws_id, 'Mission Control Migration', 'Migrate API to real Supabase Postgres schemas with RLS and realtime events.', 'building', 'mission_critical', jarvis_id);

    -- Insert Initial Task
    INSERT INTO tasks (id, workspace_id, project_id, title, description, status, priority, type, assigned_agent_id, requested_by_agent_id)
    VALUES 
        (task_id, ws_id, proj_id, 'Define Postgres Migration SQL', 'Draft the complete Supabase migration including enums, tables, FKs, indexes, RLS, and append-only triggers.', 'completed', 'critical', 'action', jarvis_id, roy_id),
        (uuid_generate_v4(), ws_id, proj_id, 'Hook UI to Postgres REST endpoints', 'Refactor the React components to consume the actual Supabase database via the Next.js API layer.', 'pending', 'high', 'action', jarvis_id, roy_id);

    -- Insert Telemetry Event representing task completion
    INSERT INTO telemetry_events (workspace_id, agent_id, task_id, project_id, category, severity, event_type, message)
    VALUES 
        (ws_id, jarvis_id, task_id, proj_id, 'event', 'info', 'TASK_COMPLETED', 'Successfully generated Supabase migration SQL files.');
END $$;
