import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const rawTasks = await prisma.tasks.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'asc' },
      include: {
        task_labels: { include: { labels: true } },
        task_checklists: { include: { task_checklist_items: { orderBy: { position: 'asc' } } } },
        task_comments: { orderBy: { created_at: 'asc' } },
        task_attachments: true
      }
    });

    const lists = [
      { id: 'list_ideas', name: 'Ideas', position: 0, tasks: rawTasks.filter(t => t.status === 'ideas') },
      { id: 'list_pending', name: 'Pending', position: 1, tasks: rawTasks.filter(t => t.status === 'pending') },
      { id: 'list_in_progress', name: 'In Progress', position: 2, tasks: rawTasks.filter(t => t.status === 'in_progress') },
      { id: 'list_under_review', name: 'Under Review', position: 3, tasks: rawTasks.filter(t => t.status === 'under_review') },
      { id: 'list_completed', name: 'Completed', position: 4, tasks: rawTasks.filter(t => t.status === 'completed') },
      { id: 'list_blocked', name: 'Blocked', position: 5, tasks: rawTasks.filter(t => t.status === 'blocked') }
    ];

    const labels = await prisma.labels.findMany({
      where: { project_id: projectId }
    });

    return NextResponse.json({ lists, labels });
  } catch (error) {
    console.error('Error fetching board data:', error);
    return NextResponse.json({ error: 'Failed to fetch board data' }, { status: 500 });
  }
}
