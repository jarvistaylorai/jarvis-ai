import { NextResponse } from 'next/server';
import { supabaseAdmin, BUCKET_NAME } from '@/lib/supabase-storage';

export async function POST(request: Request) {
  try {
    const { targetPath, workspace = 'business' } = await request.json();

    if (!targetPath) {
      return NextResponse.json({ error: 'targetPath is required' }, { status: 400 });
    }

    if (targetPath === '/' || targetPath === '') {
      return NextResponse.json({ error: 'Cannot delete root workspace' }, { status: 403 });
    }

    const cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
    const storagePath = `${workspace}/${cleanPath}`.replace(/\/+/g, '/');

    // Note: Supabase remove expects an array of file paths. If a path is actually a "folder" prefix containing multiple files, 
    // we would theoretically need to list all contents and remove them. For now, we assume simple single deletion.
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
       throw error;
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
