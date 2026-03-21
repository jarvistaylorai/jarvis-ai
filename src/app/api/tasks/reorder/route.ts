import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(request: Request) {
  try {
    const { task_id, new_list_id, new_position } = await request.json();

    if (!task_id || !new_list_id || new_position === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const task = await prisma.task.update({
      where: { id: task_id },
      data: {
        list_id: new_list_id,
        position: new_position
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error reordering task:', error);
    return NextResponse.json({ error: 'Failed to reorder task' }, { status: 500 });
  }
}
