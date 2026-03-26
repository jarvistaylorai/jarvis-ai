import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const body = await request.json();
    const template = body.template || 'Default';

    const project = await prisma.projects.findUnique({ where: { id: params.id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let taskTitles: string[] = [];

    switch (template) {
      case 'AI Product':
        taskTitles = [
          "Define architecture",
          "Set up backend",
          "Build UI system",
          "Integrate agents",
          "Testing + QA"
        ];
        break;
      case 'SaaS Platform':
        taskTitles = [
          "Database design",
          "Authentication & Authorization",
          "Core feature development",
          "Payment integration",
          "Beta release"
        ];
        break;
      case 'Internal Tool':
        taskTitles = [
          "Define requirements",
          "Build MVP",
          "Internal testing",
          "Deploy"
        ];
        break;
      case 'Experiment':
        taskTitles = [
          "Hypothesis formulation",
          "Data collection setup",
          "Run experiment",
          "Analyze results"
        ];
        break;
      default:
        taskTitles = [];
        break;
    }

    if (taskTitles.length === 0) {
      return NextResponse.json({ success: true, tasksCreated: 0 });
    }

    const mutations = taskTitles.map(title => 
      prisma.tasks.create({
        data: {
          id: 't_' + generateId(),
          title,
          status: 'pending',
          priority: 'normal',
          project_id: project.id,
          workspace_id: project.workspace_id,
          assigned_agent_id: null,
          dependency_ids: [],
          created_at: new Date().toISOString()
        }
      })
    );

    // Use any typing to circumvent the cached Typescript strict schema lint error if any
    mutations.push(
      (prisma.telemetry_events as unknown).create({
         data: {
           project_id: project.id,
           workspace_id: project.workspace_id,
           event_type: 'bootstrap',
           message: `Bootstrapped project using ${template} template, generating ${taskTitles.length} standard tasks.`
         }
      })
    );

    await prisma.$transaction(mutations);

    return NextResponse.json({ success: true, tasksCreated: taskTitles.length });
  } catch (error: unknown) {
    console.error(`API Error [POST /api/projects/:id/bootstrap]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
