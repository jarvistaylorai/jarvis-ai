import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json();
    const resolvedParams = await params;
    
    const task = await prisma.factoryTask.update({
      where: { id: resolvedParams.id },
      data: {
        title: data.title,
        description: data.description,
        stage: data.stage,
        status: data.status,
        project: data.project,
        type: data.type,
        assigned_agent: data.assigned_agent,
        progress: data.progress,
      },
    });
    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating factory task:", error);
    return NextResponse.json(
      { error: "Failed to update factory task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    await prisma.factoryTask.delete({
      where: { id: resolvedParams.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting factory task:", error);
    return NextResponse.json(
      { error: "Failed to delete factory task" },
      { status: 500 }
    );
  }
}
