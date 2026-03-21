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

    const assignment = await prisma.taskLabelAssignment.create({
      data: {
        task_id: taskId,
        label_id
      },
      include: { label: true }
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error adding label to task:', error);
    return NextResponse.json({ error: 'Failed to add label to task' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const url = new URL(request.url);
    const labelId = url.searchParams.get('label_id');

    if (!labelId) {
       return NextResponse.json({ error: 'Missing label_id' }, { status: 400 });
    }

    await prisma.taskLabelAssignment.delete({
      where: {
        task_id_label_id: { task_id: taskId, label_id: labelId }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing label from task:', error);
    return NextResponse.json({ error: 'Failed to remove label' }, { status: 500 });
  }
}
