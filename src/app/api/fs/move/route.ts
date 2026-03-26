import { NextResponse } from 'next/server';
import { supabaseAdmin, BUCKET_NAME } from '@/lib/supabase-storage';

export async function POST(request: Request) {
  try {
    const { sourcePath, destinationPath, workspace = 'business' } = await request.json();

    if (!sourcePath || !destinationPath) {
      return NextResponse.json({ error: 'sourcePath and destinationPath are required' }, { status: 400 });
    }

    if (sourcePath === '/' || sourcePath === '') {
      return NextResponse.json({ error: 'Cannot move root workspace' }, { status: 403 });
    }

    const cleanSource = sourcePath.startsWith('/') ? sourcePath.slice(1) : sourcePath;
    const cleanDest = destinationPath.startsWith('/') ? destinationPath.slice(1) : destinationPath;
    
    const storageSource = `${workspace}/${cleanSource}`.replace(/\/+/g, '/');
    const storageDest = `${workspace}/${cleanDest}`.replace(/\/+/g, '/');

    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .move(storageSource, storageDest);

    if (error) {
       console.error('Storage move error:', error);
       throw error;
    }

    return NextResponse.json({ success: true, message: 'Moved successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
