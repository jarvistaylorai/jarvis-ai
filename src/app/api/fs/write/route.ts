import { NextResponse } from 'next/server';
import { supabaseAdmin, BUCKET_NAME } from '@/lib/supabase-storage';

export async function POST(request: Request) {
  try {
    const { targetPath, content, isFolder, workspace = 'business' } = await request.json();

    if (!targetPath) {
      return NextResponse.json({ error: 'targetPath is required' }, { status: 400 });
    }

    const cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
    const storagePath = `${workspace}/${cleanPath}`.replace(/\/+/g, '/');

    if (isFolder) {
      // In Supabase, folders are implicit. We create an empty hidden file to represent an empty directory.
      const folderPlaceholderPath = `${storagePath}/.emptyFolderPlaceholder`.replace(/\/+/g, '/');
      await supabaseAdmin.storage.from(BUCKET_NAME).upload(
        folderPlaceholderPath,
        Buffer.from(''),
        { upsert: true }
      );
      return NextResponse.json({ success: true, message: 'Folder created successfully' });
    }

    const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(
      storagePath,
      Buffer.from(content || '', 'utf-8'),
      { contentType: 'text/plain', upsert: true }
    );

    if (error) {
       console.error("Storage Write Error:", error);
       throw error;
    }

    return NextResponse.json({ success: true, message: 'File written successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
