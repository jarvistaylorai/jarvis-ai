import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { supabaseAdmin, BUCKET_NAME, ensureBucket } from '@/lib/supabase-storage';
import path from 'path';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Ensure the task exists
    const task = await prisma.tasks.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await ensureBucket();

    // Create a path inside the storage bucket isolating files by workspace/task
    const workspace = task.workspace_id || 'default';
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${workspace}/tasks/${taskId}/${safeFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Supabase Storage error:", uploadError);
      throw uploadError;
    }

    const attachment = await prisma.task_attachments.create({
      data: {
        task_id: taskId,
        file_name: file.name,
        file_path: storagePath
      }
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
