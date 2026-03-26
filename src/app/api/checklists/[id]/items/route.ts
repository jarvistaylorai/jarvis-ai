import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: checklistId } = await params;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const lastItem = await prisma.task_checklist_items.findFirst({
      where: { checklist_id: checklistId },
      orderBy: { position: 'desc' },
    });
    const position = lastItem ? lastItem.position + 1024 : 1024;

    const item = await prisma.task_checklist_items.create({
      data: {
        checklist_id: checklistId,
        content,
        position
      }
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error adding checklist item:', error);
    return NextResponse.json({ error: 'Failed to add checklist item' }, { status: 500 });
  }
}
