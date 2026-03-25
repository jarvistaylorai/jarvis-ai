import { NextResponse } from 'next/server';
import { updateAgent } from '@/lib/services/agent-service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const agent = await updateAgent(id, {
      status: body.status,
      currentTaskId: body.current_task_id,
      currentProjectId: body.current_project_id,
      currentChannel: body.current_channel,
      capabilityTags: body.capability_tags,
      utilizationPercent: body.utilization_percent,
      metadata: body.metadata
    });
    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('API Error [PATCH /api/agents/:id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
