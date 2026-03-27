import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Task, Agent, Project, Alert, TelemetryEvent } from '@contracts';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@contracts';

type Paginated<T> = { data: T[]; next_cursor?: string };

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export function useDashboard(workspaceId: string) {
  return useQuery({
    queryKey: ['dashboard', workspaceId],
    queryFn: () => fetcher<unknown>(`/api/dashboard?workspace=${workspaceId}`),
    refetchInterval: false, // Relies on SSE
  });
}

export function useProjects(workspaceId: string) {
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => fetcher<Paginated<Project>>(`/api/projects?workspace=${workspaceId}`),
  });
}

export function useAgents(workspaceId: string) {
  return useQuery({
    queryKey: ['agents', workspaceId],
    queryFn: () => fetcher<Paginated<Agent>>(`/api/agents?workspace=${workspaceId}`),
  });
}

export function useTasks(workspaceId: string) {
  return useQuery({
    queryKey: ['tasks', workspaceId],
    queryFn: () => fetcher<Paginated<Task>>(`/api/tasks?workspace=${workspaceId}`),
  });
}

export function useAlerts(workspaceId: string) {
  return useQuery({
    queryKey: ['alerts', workspaceId],
    queryFn: () => fetcher<Paginated<Alert>>(`/api/alerts?workspace=${workspaceId}`),
  });
}

export function useTelemetry(workspaceId: string) {
  return useQuery({
    queryKey: ['telemetry', workspaceId],
    queryFn: () => fetcher<{ events: TelemetryEvent[] }>(`/api/telemetry/stream?workspace=${workspaceId}`),
    enabled: false, // Only managed via SSE
  });
}

export function useLiveMissionControl(workspaceId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;

    const eventSource = new EventSource(`/api/telemetry/stream?workspace=${workspaceId}`);

    eventSource.addEventListener('snapshot', (e) => {
      try {
        const telemetry = JSON.parse(e.data);
        queryClient.setQueryData(['dashboard', workspaceId], (old: Record<string, unknown>) => ({
          ...(old || {}),
          telemetry: telemetry
        }));
            } catch (err) {}
    });

    eventSource.addEventListener('task.updated', (e) => {
      try {
        const task = JSON.parse(e.data);
        queryClient.setQueryData(['tasks', workspaceId], (old: Paginated<Task> | undefined) => {
          if (!old) return old;
          const tasks = [...old.data];
          const idx = tasks.findIndex(t => t.id === task.id);
          if (idx >= 0) tasks[idx] = task;
          else tasks.unshift(task);
          return { ...old, data: tasks };
        });
        queryClient.setQueryData(['dashboard', workspaceId], (old: Record<string, unknown>) => {
          if (!old) return old;
          const tasks = [...(old.tasks || [])];
          const idx = tasks.findIndex((t: Task) => t.id === task.id);
          if (idx >= 0) tasks[idx] = task;
          else tasks.unshift(task);
          return { ...old, tasks };
        });
            } catch (err) {}
    });

    eventSource.addEventListener('agent.updated', (e) => {
      try {
        const agent = JSON.parse(e.data);
        queryClient.setQueryData(['agents', workspaceId], (old: Paginated<Agent> | undefined) => {
          if (!old) return old;
          const agents = [...old.data];
          const idx = agents.findIndex(a => a.id === agent.id);
          if (idx >= 0) agents[idx] = agent;
          else agents.unshift(agent);
          return { ...old, data: agents };
        });
        queryClient.setQueryData(['dashboard', workspaceId], (old: Record<string, unknown>) => {
          if (!old) return old;
          const agents = [...(old.agents || [])];
          const idx = agents.findIndex((a: Agent) => a.id === agent.id);
          if (idx >= 0) agents[idx] = agent;
          else agents.unshift(agent);
          return { ...old, agents };
        });
            } catch (err) {}
    });

    eventSource.addEventListener('alert.created', (e) => {
      try {
        const alert = JSON.parse(e.data);
        queryClient.setQueryData(['alerts', workspaceId], (old: Paginated<Alert> | undefined) => {
          if (!old) return old;
          return { ...old, data: [alert, ...old.data] };
        });
        queryClient.setQueryData(['dashboard', workspaceId], (old: Record<string, unknown>) => {
          if (!old) return old;
          return { ...old, alerts: [alert, ...(old.alerts || [])] };
        });
            } catch (err) {}
    });

    eventSource.addEventListener('telemetry.created', (e) => {
      try {
        const event = JSON.parse(e.data);
        queryClient.setQueryData(['dashboard', workspaceId], (old: Record<string, unknown>) => {
          if (!old || !old.telemetry) return old;
          return {
            ...old,
            telemetry: {
              ...old.telemetry,
              events: [event, ...old.telemetry.events]
            }
          };
        });
        queryClient.setQueryData(['telemetry', workspaceId], (old: Record<string, unknown>) => {
          if (!old) return old;
          return {
            events: [event, ...(old.events || [])]
          };
        });
            } catch (err) {}
    });

    return () => {
      eventSource.close();
    };
  }, [workspaceId, queryClient]);
}

// Mutations
export function useUpdateTask() {
    const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Task> & { id: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
            onSuccess: (data, variables) => {
      // The SSE stream will catch the update and update the queries automatically,
      // but we can also eagerly invalidate if desired.
      // queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
}

export function useCreateTask() {
  return useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch(`/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  });
}

export function useUpdateAgent() {
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Agent> & { id: string }) => {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  });
}
