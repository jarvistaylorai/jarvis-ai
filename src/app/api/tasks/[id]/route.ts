import { NextResponse } from 'next/server';
import { updateTask } from '@/lib/services/task-service';
import { prisma } from '@/lib/services/database';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const task = await updateTask(id, {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      type: body.type,
      projectId: body.project_id,
      parentTaskId: body.parent_task_id,
      objectiveId: body.objective_id,
      assignedAgentId: body.assigned_agent_id,
      requestedByAgentId: body.requested_by_agent_id,
      dependencyIds: body.dependency_ids,
      tags: body.tags,
      autoExecute: body.auto_execute,
      dueAt: body.due_date || body.due_at,
      startedAt: body.start_date || body.started_at,
      completedAt: body.completed_at,
      blockedReason: body.blocked_reason,
      metadata: body.metadata
    });
    return NextResponse.json(task);
  } catch (error: any) {
    console.error('API Error [PATCH /api/tasks/:id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.tasks.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error [DELETE /api/tasks/:id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
