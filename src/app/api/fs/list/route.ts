import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabaseAdmin, BUCKET_NAME, ensureBucket } from '@/lib/supabase-storage';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path') || '/';
    const workspace = searchParams.get('workspace') || 'business';

    await ensureBucket();

    // Clean paths
    const cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
    const prefix = cleanPath ? `${workspace}/${cleanPath}/`.replace(/\/+/g, '/') : `${workspace}/`;

    const { data: listData, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(prefix, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
       console.error("Storage list error:", error);
       return NextResponse.json({ error: 'Directory not found or access denied' }, { status: 404 });
    }

    const items = listData
      .filter((file) => file.name !== '.emptyFolderPlaceholder') // Filter out placeholders
      .map((file) => {
        const isFolder = !file.metadata; // In Supabase, folders don't have metadata blocks in list view
        const itemPath = path.join(targetPath, file.name).replace(/\\/g, '/').replace('//', '/');
        
        return {
          id: Buffer.from(itemPath).toString('base64'),
          name: file.name,
          type: isFolder ? 'folder' : 'file',
          size: file.metadata?.size || 0,
          items: 0, // Children counts are not queried in 1 pass for Storage
          modified_at: file.metadata?.mimetype ? file.created_at : new Date().toISOString(),
          path: itemPath
        };
      });

    // Sort folders first
    items.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error('List Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
