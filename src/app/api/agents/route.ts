import { NextResponse } from 'next/server';
import { listAgents, createAgent } from '@/lib/services/agent-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace') || 'business';
    const result = await listAgents({ workspaceId });
    return NextResponse.json({ data: result.data });
  } catch (error: any) {
    console.error('API Error [GET /api/agents]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.role) {
      return NextResponse.json({ error: 'name and role are required' }, { status: 400 });
    }
    const agent = await createAgent({
      workspaceId: body.workspace_id || body.workspace || 'business',
      name: body.name,
      role: body.role,
      description: body.description,
      capabilityTags: body.capability_tags,
      status: body.status,
      load: body.load,
      layer: body.layer
    });
    return NextResponse.json(agent, { status: 201 });
  } catch (error: any) {
    console.error('API Error [POST /api/agents]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
