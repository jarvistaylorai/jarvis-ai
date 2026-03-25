import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSystemState } from '@/lib/system/state';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// Compute phase progress + status from tasks
function computePhaseMetrics(tasks: any[]) {
  const total = tasks.length;
  if (total === 0) return { progress: 0, status: 'NOT_STARTED', task_count: 0, completed_tasks: 0 };
  const completed = tasks.filter(t => t.status === 'completed').length;
  const progress = Math.round((completed / total) * 100);
  let status = 'NOT_STARTED';
  if (completed === total) status = 'COMPLETED';
  else if (completed > 0 || tasks.some(t => t.status === 'in-progress')) status = 'IN_PROGRESS';
  return { progress, status, task_count: total, completed_tasks: completed };
}

function computeObjectiveMetrics(phases: any[]) {
  if (phases.length === 0) return { progress: 0, status: 'ACTIVE' };
  const avgProgress = Math.round(phases.reduce((sum: number, p: any) => sum + p.progress, 0) / phases.length);
  let status = 'ACTIVE';
  if (phases.every((p: any) => p.status === 'COMPLETED')) status = 'COMPLETED';
  else if (phases.some((p: any) => p.status === 'IN_PROGRESS' || p.status === 'COMPLETED')) status = 'IN_PROGRESS';
  return { progress: avgProgress, status };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    let [
      agents,
      tasks,
      activity,
      projects,
      system_state_arr,
      objectives,
      phases,
      alerts,
      agent_memory,
      automation_rules,
      global_lists
    ] = await Promise.all([
      prisma.agents.findMany({ where: { workspace } }),
      prisma.tasks.findMany({
        where: { workspace },
        include: {
          project: true,
          labels: { include: { label: true } },
          checklists: { include: { items: true } },
          comments: true,
          attachments: true,
          phase: { select: { id: true, title: true, objective: { select: { id: true, title: true } } } }
        }
      }),
      prisma.telemetry_events.findMany({ where: { workspace }, orderBy: { timestamp: 'desc' }, take: 50 }),
      prisma.projects.findMany({ where: { workspace } }),
      prisma.systemState.findMany({ where: { workspace } }),
      prisma.objectives.findMany({
        where: { workspace },
        include: {
          project: { select: { id: true, name: true } },
          phases: {
            orderBy: { position: 'asc' },
            include: { tasks: true }
          }
        }
      }),
      prisma.phases.findMany({ where: { workspace }, include: { tasks: true } }),
      prisma.alerts.findMany({ where: { workspace } }),
      prisma.agentMemory.findMany({ where: { workspace } }),
      prisma.automationRule.findMany({ where: { workspace } }),
      prisma.taskList.findMany({ where: { workspace, project_id: 'global' }, orderBy: { position: 'asc' } })
    ]);

    if (global_lists.length === 0) {
      const defaultColumns = ['Ideas', 'To-Do', 'Doing', 'Under Review', 'Done'];
      await prisma.$transaction(
        defaultColumns.map((name, index) => 
          prisma.taskList.create({
            data: { workspace, project_id: 'global', name, position: (index + 1) * 1024 }
          })
        )
      );
      global_lists = await prisma.taskList.findMany({ where: { workspace, project_id: 'global' }, orderBy: { position: 'asc' } });
    }

    const system_state = system_state_arr[0] || { status: 'NORMAL', active_agents: 0, pending_tasks: 0, blocked_tasks: 0, last_evaluated_at: new Date().toISOString() };

    // Parse dependencies since SQLite stores it as a literal string
    const formattedTasks = tasks.map((t: any) => ({
      ...t,
      dependencies: JSON.parse(t.dependencies || '[]')
    }));

    // Compute objective progress from phases
    const computedObjectives = objectives.map((obj: any) => {
      const phasesWithMetrics = obj.phases.map((phase: any) => {
        const metrics = computePhaseMetrics(phase.tasks);
        return { id: phase.id, title: phase.title, position: phase.position, target_date: phase.target_date, ...metrics };
      });
      const objMetrics = computeObjectiveMetrics(phasesWithMetrics);
      const currentPhase = phasesWithMetrics.find((p: any) => p.status === 'IN_PROGRESS') || phasesWithMetrics.find((p: any) => p.status === 'NOT_STARTED');
      return {
        id: obj.id, title: obj.title, description: obj.description, priority: obj.priority,
        target_date: obj.target_date, created_at: obj.created_at, project: obj.project,
        progress: objMetrics.progress, status: objMetrics.status,
        phase_count: phasesWithMetrics.length, current_phase: currentPhase?.title || null,
        phases: phasesWithMetrics
      };
    });

    const fsState = await getSystemState();

    const mergedAgents = agents.map((a: any) => {
      const fsA = fsState.agents?.find((fa: any) => fa.id === a.id);
      return fsA ? { ...a, ...fsA } : a;
    });
    const missingAgents = fsState.agents?.filter((fa: any) => !agents.find((a: any) => a.id === fa.id)) || [];
    mergedAgents.push(...missingAgents);

    const mergedTasks = formattedTasks.map((t: any) => {
      const fsT = fsState.tasks?.find((ft: any) => ft.id === t.id);
      return fsT ? { ...t, ...fsT } : t;
    });
    const missingTasks = fsState.tasks?.filter((ft: any) => !formattedTasks.find((t: any) => t.id === ft.id)) || [];
    mergedTasks.push(...missingTasks);

    const mergedActivity = fsState.activity && fsState.activity.length > 0 ? fsState.activity : activity;

    return NextResponse.json({
      agents: mergedAgents,
      tasks: mergedTasks,
      activity: mergedActivity,
      projects,
      messages: [],
      system_state,
      objectives: computedObjectives,
      phases,
      alerts,
      agent_memory,
      automation_rules,
      global_lists
    });
  } catch (error: any) {
    console.error("API Error [GET /api/system]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}