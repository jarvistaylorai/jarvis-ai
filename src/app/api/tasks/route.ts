import { NextResponse } from 'next/server';
import { listTasks, createTask } from '@/lib/services/task-service';
import { TaskPriority, TaskStatus, TaskType } from '@contracts';

export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace') || 'business';
    const limit = parseInt(searchParams.get('limit') || '5000', 10);
    const cursor = searchParams.get('cursor') || undefined;
    const status = searchParams.get('status') as TaskStatus | null;

    const result = await listTasks({
      workspaceId,
      limit: Number.isNaN(limit) ? 5000 : limit,
      cursor,
      status: status && Object.values(TaskStatus).includes(status) ? status : undefined
    });

    return NextResponse.json({
      data: result.data,
      next_cursor: result.next_cursor
    });
  } catch (error: unknown) {
    console.error('API Error [GET /api/tasks]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const task = await createTask({
      workspaceId: body.workspace_id || body.workspace || 'business',
      title: body.title,
      description: body.description,
      status: body.status && Object.values(TaskStatus).includes(body.status) ? body.status : TaskStatus.PENDING,
      priority: body.priority && Object.values(TaskPriority).includes(body.priority) ? body.priority : TaskPriority.NORMAL,
      type: body.type && Object.values(TaskType).includes(body.type) ? body.type : TaskType.ACTION,
      projectId: body.project_id,
      parentTaskId: body.parent_task_id,
      objectiveId: body.objective_id,
      assignedAgentId: body.assigned_agent_id,
      requestedByAgentId: body.requested_by_agent_id,
      dependencyIds: body.dependency_ids,
      tags: body.tags,
      autoExecute: body.auto_execute,
      dueAt: body.due_at,
      startedAt: body.started_at,
      completedAt: body.completed_at,
      blockedReason: body.blocked_reason,
      metadata: body.metadata
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    console.error('API Error [POST /api/tasks]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
