import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const project = await prisma.projects.findUnique({
      where: { id: params.id },
      include: {
        tasks: true,
        telemetry_events: {
          orderBy: { created_at: 'desc' },
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // derived agents computation
    const agentsSet = new Set((project.tasks || []).map((t: any) => t.assigned_agent_id).filter(Boolean));

    return NextResponse.json({
      ...project,
      derived_agents: Array.from(agentsSet)
    });
  } catch (error: any) {
    console.error(`API Error [GET /api/projects/:id]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const body = await request.json();
    
    const updatedProject = await prisma.projects.update({
      where: { id: params.id },
      data: body
    });

    // Optionally log activity if status changed
    if (body.status) {
      await prisma.telemetry_events.create({
        data: {
          project_id: params.id,
          workspace_id: updatedProject.workspace_id,
          event_type: 'status_changed',
          message: `Project status updated to ${body.status}`
        }
      });
    }

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    console.error(`API Error [PATCH /api/projects/:id]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
