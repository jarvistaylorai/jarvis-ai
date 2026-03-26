import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@/types/contracts';

const prisma = new PrismaClient();

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const objective = await prisma.objectives.findUnique({
      where: { id },
      include: {
        projects: { select: { id: true, name: true } },
        tasks: {
          include: {
            task_labels: { include: { labels: true } },
            task_checklists: { include: { task_checklist_items: true } },
          }
        }
      }
    });

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    const mockPhase = {
      id: 'default-phase',
      title: objective.current_phase || 'Default Phase',
      position: 0,
      target_date: null,
      created_at: objective.created_at,
      tasks: objective.tasks || []
    };

    const phasesWithMetrics = [mockPhase].map(phase => {
      const metrics = computePhaseMetrics(phase.tasks);
      return {
        id: phase.id,
        title: phase.title,
        position: phase.position,
        target_date: phase.target_date,
        created_at: phase.created_at,
        tasks: phase.tasks,
        ...metrics
      };
    });

    const objMetrics = computeObjectiveMetrics(phasesWithMetrics, objective.created_at);
    const currentPhase = phasesWithMetrics.find(p => p.status === 'IN_PROGRESS') || phasesWithMetrics.find(p => p.status === 'NOT_STARTED');

    return NextResponse.json({
      id: objective.id,
      title: objective.title,
      description: objective.description,
      priority: objective.priority,
      target_date: objective.target_date,
      created_at: objective.created_at,
      project: objective.projects,
      progress: objMetrics.progress,
      status: objMetrics.status,
      last_activity_at: objMetrics.last_activity_at,
      tasks_completed_today: objMetrics.tasks_completed_today,
      current_phase: currentPhase?.title || null,
      phases: phasesWithMetrics
    });
  } catch (error: unknown) {
    console.error('API Error [GET /api/objectives/:id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: unknown = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.project_id !== undefined) data.project_id = body.project_id || null;
    if (body.target_date !== undefined) data.target_date = body.target_date ? new Date(body.target_date) : null;
    if (body.status !== undefined) data.status = body.status;

    const objective = await prisma.objectives.update({
      where: { id },
      data
    });

    return NextResponse.json(objective);
  } catch (error: unknown) {
    console.error('API Error [PATCH /api/objectives/:id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.objectives.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('API Error [DELETE /api/objectives/:id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
