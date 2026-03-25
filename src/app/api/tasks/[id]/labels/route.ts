import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { label_id } = await request.json();

    if (!label_id) {
      return NextResponse.json({ error: 'Missing logic_id' }, { status: 400 });
    }

    const assignment = await prisma.task_labels.create({
      data: {
        task_id: taskId,
        label_id
      },
      include: { labels: true }
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error adding label to task:', error);
    return NextResponse.json({ error: 'Failed to add label to task' }, { status: 500 });
  }
}
