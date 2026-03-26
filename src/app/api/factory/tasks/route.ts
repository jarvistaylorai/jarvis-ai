import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Agent, Task, Project, Alert, TelemetryEvent } from '@/types/contracts';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tasks = await prisma.tasks.findMany({
      where: { tags: { has: "factory" } },
      orderBy: { created_at: "desc" },
    });
    
    const projected = tasks.map((t: Task) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      stage: t.status === 'ideas' ? 'ideation' : t.status === 'completed' ? 'completed' : 'in-progress',
      status: t.status === 'completed' ? 'completed' : 'active',
      project: "Uncategorized",
      type: t.type,
      assigned_agent: t.assigned_agent_id,
      progress: t.status === 'completed' ? 100 : 0,
    }));
    return NextResponse.json(projected);
  } catch (error) {
    console.error("Error fetching factory tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch factory tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const DEFAULT_WORKSPACE = "00000000-0000-0000-0000-000000000000";
    const task = await prisma.tasks.create({
      data: {
        workspace_id: DEFAULT_WORKSPACE,
        title: data.title,
        description: data.description || "",
        status: data.status === "completed" ? "completed" : "pending",
        priority: "normal",
        type: data.type === 'feature' ? 'action' : 'action',
        assigned_agent_id: data.assigned_agent || null,
        tags: ["factory"]
      },
    });
    return NextResponse.json(task);
  } catch (error) {
    console.error("Error creating factory task:", error);
    return NextResponse.json(
      { error: "Failed to create factory task" },
      { status: 500 }
    );
  }
}
