import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  try {
    const { id: taskId, labelId } = await params;

    await prisma.task_labels.delete({
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
