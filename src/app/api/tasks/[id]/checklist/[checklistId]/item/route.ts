import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const { checklistId } = await params;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    // Get current max position
    const maxPos = await prisma.task_checklist_items.aggregate({
      where: { checklist_id: checklistId },
      _max: { position: true },
    });

    const item = await prisma.task_checklist_items.create({
      data: {
        checklist_id: checklistId,
        content,
        is_completed: false,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error creating checklist item:', error);
    return NextResponse.json({ error: 'Failed to create checklist item' }, { status: 500 });
  }
}
