import { NextResponse } from 'next/server';
import { updateTask } from '@/lib/services/task-service';
import { prisma } from '@/lib/services/database';
import { supabaseAdmin } from '@/lib/supabase-storage';
import { Agent } from '@contracts';

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
  } catch (error: unknown) {
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
    
    // Clean up Supabase storage files first
    const attachments = await prisma.task_attachments.findMany({ where: { task_id: id } });
    if (attachments.length > 0) {
      const filesToRemove = attachments.map((a: Agent) => a.file_path);
      const { error: storageError } = await supabaseAdmin.storage
        .from('jarvis-fs')
        .remove(filesToRemove);
      if (storageError) console.error('Supabase storage deletion error:', storageError);
    }

    // Use transaction to nullify optional references and then delete task
    await prisma.$transaction([
      prisma.telemetry_events.updateMany({ where: { task_id: id }, data: { task_id: null } }),
      prisma.tasks.updateMany({ where: { parent_task_id: id }, data: { parent_task_id: null } }),
      prisma.agents.updateMany({ where: { current_task_id: id }, data: { current_task_id: null } }),
      prisma.tasks.delete({ where: { id } })
    ]);
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('API Error [DELETE /api/tasks/:id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
