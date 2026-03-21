import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tasks = await prisma.factoryTask.findMany({
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(tasks);
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
    const task = await prisma.factoryTask.create({
      data: {
        title: data.title,
        description: data.description || "",
        stage: data.stage || "ideation",
        status: data.status || "active",
        project: data.project || "Uncategorized",
        type: data.type || "feature",
        assigned_agent: data.assigned_agent || null,
        progress: data.progress || 0,
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
