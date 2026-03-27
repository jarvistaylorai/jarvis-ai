import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabaseAdmin, BUCKET_NAME, ensureBucket } from '@/lib/supabase-storage';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const targetPath = formData.get('targetPath') as string | null;
    const workspace = (formData.get('workspace') as string) || 'business';

    if (!file || !targetPath) {
      return NextResponse.json({ error: 'Missing file or targetPath' }, { status: 400 });
    }

    await ensureBucket();

    // Remove leading slash if present and build a clean path with the workspace as the root partition
    const cleanTargetPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
    const safeStoragePath = `${workspace}/${cleanTargetPath}/${file.name}`.replace(/\/+/g, '/');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

        const { data: uploadData, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(safeStoragePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Supabase Storage Upload Error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, path: path.join(targetPath, file.name).replace(/\\/g, '/') });
  } catch (error: unknown) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 });
  }
}
