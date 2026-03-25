import { NextResponse } from 'next/server';
import { updateTask } from '@/lib/services/task-service';
import { TaskStatus } from '@contracts';

export async function PATCH(request: Request) {
  try {
    const { task_id, new_list_id, new_position } = await request.json();

    if (!task_id || !new_list_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validStatus = new_list_id.replace('-', '_') as TaskStatus;

    const task = await updateTask(task_id, {
      status: validStatus,
      metadata: { position: new_position } // Safely tuck exact sort order into the JSON
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error reordering task:', error);
    return NextResponse.json({ error: 'Failed to reorder task' }, { status: 500 });
  }
}
