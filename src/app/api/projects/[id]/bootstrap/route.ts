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

    const project = await prisma.project.findUnique({ where: { id: params.id } });
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
      prisma.task.create({
        data: {
          id: 't_' + generateId(),
          title,
          status: 'pending',
          priority: 'normal',
          project_id: project.id,
          assigned_agent: 'Unassigned',
          dependencies: "[]",
          created_at: new Date().toISOString()
        }
      })
    );

    // Use any typing to circumvent the cached Typescript strict schema lint error if any
    mutations.push(
      (prisma.projectActivity as any).create({
         data: {
           project_id: project.id,
           message: `Bootstrapped project using ${template} template, generating ${taskTitles.length} standard tasks.`
         }
      })
    );

    await prisma.$transaction(mutations);

    return NextResponse.json({ success: true, tasksCreated: taskTitles.length });
  } catch (error: any) {
    console.error(`API Error [POST /api/projects/:id/bootstrap]:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
