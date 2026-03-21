import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    const projects = await prisma.project.findMany({
      where: { workspace },
      include: {
        tasks: true,
        project_activity: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const computedProjects = projects.map(p => {
      const tasks = p.tasks || [];
      const completed_tasks = tasks.filter(t => t.status === 'completed').length;
      const blocked_tasks = tasks.filter(t => t.status === 'blocked').length;
      const task_count = tasks.length;
      let progress = p.progress;
      
      if (task_count > 0) {
        progress = Math.round((completed_tasks / task_count) * 100);
      }

      // Compute Health
      let health = p.health || 'HEALTHY';
      const lastActivity = p.project_activity?.[0]?.created_at || p.updated_at;
      const hoursSinceActivity = (new Date().getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);

      if (blocked_tasks > 0) {
        health = 'BLOCKED';
      } else if (hoursSinceActivity > 48) {
        health = 'STALLED';
      } else if (p.priority === 'HIGH' && progress < 50 && hoursSinceActivity > 24) {
        health = 'AT_RISK';
      } else {
        health = 'HEALTHY';
      }

      // Derived Agents
      const agentsSet = new Set(tasks.map(t => t.assigned_agent).filter(Boolean));
      
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        priority: p.priority,
        progress,
        health,
        task_count,
        completed_tasks,
        blocked_tasks,
        derived_agents: agentsSet.size,
        last_activity_at: lastActivity,
        created_at: p.created_at,
        updated_at: p.updated_at,
        automation_enabled: p.automation_enabled,
        auto_assign: p.auto_assign,
        type: p.type,
      };
    });

    return NextResponse.json(computedProjects);
  } catch (error: any) {
    console.error("API Error [GET /api/projects]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const system_config = {
      mode: body.mode || 'manual',
      deadline: body.deadline || null,
      max_parallel_tasks: 3,
      allowed_agents: []
    };

    const project = await prisma.project.create({
      data: {
        workspace,
        name: body.name,
        description: body.description || null,
        type: body.type || null,
        status: 'IDEA',
        priority: body.priority || 'MEDIUM',
        auto_assign: body.auto_assign !== undefined ? body.auto_assign : true,
        automation_enabled: body.automation_enabled !== undefined ? body.automation_enabled : false,
        system_config: JSON.stringify(system_config)
      }
    });

    await prisma.projectActivity.create({
      data: {
        project_id: project.id,
        message: "Project created"
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("API Error [POST /api/projects]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
