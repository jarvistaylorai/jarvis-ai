import { NextResponse } from 'next/server';
import { prisma } from '@/lib/services/database';
import { getWorkspaceId } from '@/lib/workspace-utils';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@/types/contracts';

export const dynamic = 'force-dynamic';

// Compute phase progress + status from tasks
function computePhaseMetrics(tasks: unknown[]) {
  const total = tasks.length;
  if (total === 0) return { progress: 0, status: 'NOT_STARTED', task_count: 0, completed_tasks: 0 };
  const completed = tasks.filter(t => t.status === 'completed').length;
  const progress = Math.round((completed / total) * 100);
  let status = 'NOT_STARTED';
  if (completed === total) status = 'COMPLETED';
  else if (completed > 0 || tasks.some(t => t.status === 'in-progress')) status = 'IN_PROGRESS';
  return { progress, status, task_count: total, completed_tasks: completed };
}

// Compute objective progress + status from phases
function computeObjectiveMetrics(phases: unknown[], created_at: Date) {
  let last_activity_at = created_at.getTime();
  let tasks_completed_today = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  phases.forEach((p: Project) => {
    // Phase created_at gives a base line for phase activity
    if (p.created_at && p.created_at.getTime() > last_activity_at) {
      last_activity_at = p.created_at.getTime();
    }
    
    (p.tasks || []).forEach((t: Task) => {
      const taskUpdatedStr = new Date(t.updated_at).toISOString().split('T')[0];
      const taskUpdatedTime = new Date(t.updated_at).getTime();
      
      if (taskUpdatedTime > last_activity_at) {
        last_activity_at = taskUpdatedTime;
      }
      
      if (t.status === 'completed' && taskUpdatedStr === todayStr) {
        tasks_completed_today++;
      }
    });
  });

  let status = 'ACTIVE';
  if (phases.length > 0) {
    if (phases.every((p: Project) => p.status === 'COMPLETED')) status = 'COMPLETED';
    else if (phases.some((p: Project) => p.status === 'IN_PROGRESS' || p.status === 'COMPLETED')) status = 'IN_PROGRESS';
  }

  const avgProgress = phases.length === 0 ? 0 : Math.round(phases.reduce((sum: number, p: any) => sum + p.progress, 0) / phases.length);

  return { progress: avgProgress, status, last_activity_at: new Date(last_activity_at).toISOString(), tasks_completed_today };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';
    const mappedWorkspaceId = getWorkspaceId(workspace);

    const objectives = await prisma.objectives.findMany({
      where: { workspace_id: mappedWorkspaceId },
      include: {
        projects: { select: { id: true, name: true } },
        tasks: true
      },
      orderBy: { created_at: 'desc' }
    });

    const computed = objectives.map(obj => {
      // Synthesize a main phase
      const singlePhase = {
        id: 'phase-main',
        title: 'Execution Phase',
        position: 1,
        target_date: obj.target_date,
        tasks: obj.tasks || []
      };
      
      const phasesWithMetrics = [singlePhase].map(phase => {
        const metrics = computePhaseMetrics(phase.tasks);
        return {
          id: phase.id,
          title: phase.title,
          position: phase.position,
          target_date: phase.target_date,
          ...metrics
        };
      });

      const objMetrics = computeObjectiveMetrics(phasesWithMetrics, obj.created_at);
      const currentPhase = phasesWithMetrics.find(p => p.status === 'IN_PROGRESS') || phasesWithMetrics.find(p => p.status === 'NOT_STARTED');

      return {
        id: obj.id,
        title: obj.title,
        description: obj.description,
        priority: obj.priority,
        target_date: obj.target_date,
        created_at: obj.created_at,
        project: obj.projects,
        progress: objMetrics.progress,
        status: objMetrics.status,
        last_activity_at: objMetrics.last_activity_at,
        tasks_completed_today: objMetrics.tasks_completed_today,
        phase_count: phasesWithMetrics.length,
        current_phase: currentPhase?.title || null,
        phases: phasesWithMetrics
      };
    });

    return NextResponse.json(computed);
  } catch (error: unknown) {
    console.error('API Error [GET /api/objectives]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';
    const mappedWorkspaceId = getWorkspaceId(workspace);
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const objective = await prisma.objectives.create({
      data: {
        workspace_id: mappedWorkspaceId,
        title: body.title,
        description: body.description || null,
        project_id: body.project_id || null,
        priority: body.priority || 'medium',
        target_date: body.target_date ? new Date(body.target_date) : null,
      }
    });

    return NextResponse.json(objective, { status: 201 });
  } catch (error: unknown) {
    console.error('API Error [POST /api/objectives]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
