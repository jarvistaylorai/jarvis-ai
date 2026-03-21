import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let lists = await prisma.taskList.findMany({
      where: { project_id: projectId },
      orderBy: { position: 'asc' },
      include: {
        tasks: {
          orderBy: { position: 'asc' },
          include: {
            labels: { include: { label: true } },
            checklists: { include: { items: { orderBy: { position: 'asc' } } } },
            comments: { orderBy: { created_at: 'asc' } },
            attachments: true
          }
        }
      }
    });

    if (lists.length === 0) {
      const defaultColumns = ['Ideas', 'To-Do', 'Doing', 'Under Review', 'Done'];
      await prisma.$transaction(
        defaultColumns.map((name, index) => 
          prisma.taskList.create({
            data: { project_id: projectId, name, position: (index + 1) * 1024 }
          })
        )
      );
      lists = await prisma.taskList.findMany({
        where: { project_id: projectId },
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: {
              labels: { include: { label: true } },
              checklists: { include: { items: { orderBy: { position: 'asc' } } } },
              comments: { orderBy: { created_at: 'asc' } },
              attachments: true
            }
          }
        }
      });
    }

    const labels = await prisma.taskLabel.findMany({
      where: { project_id: projectId }
    });

    return NextResponse.json({ lists, labels });
  } catch (error) {
    console.error('Error fetching board data:', error);
    return NextResponse.json({ error: 'Failed to fetch board data' }, { status: 500 });
  }
}
