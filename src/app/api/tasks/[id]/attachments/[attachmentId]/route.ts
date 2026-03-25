import { NextResponse } from 'next/server';
import { prisma } from '@/lib/services/database';
import { supabaseAdmin } from '@/lib/supabase-storage';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id: taskId, attachmentId } = await params;

    const attachment = await prisma.task_attachments.findUnique({
      where: { id: attachmentId, task_id: taskId }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const { error: storageError } = await supabaseAdmin.storage
      .from('jarvis-fs')
      .remove([attachment.file_path]);

    if (storageError) {
      console.error('Supabase storage deletion error:', storageError);
    }

    await prisma.task_attachments.delete({
      where: { id: attachmentId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error [DELETE /api/tasks/[id]/attachments/[attachmentId]]:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete attachment' }, { status: 500 });
  }
}
