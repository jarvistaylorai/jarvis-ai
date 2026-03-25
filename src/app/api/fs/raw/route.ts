import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabaseAdmin, BUCKET_NAME } from '@/lib/supabase-storage';
import path from 'path';

const mimeTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.csv': 'text/csv',
  '.xml': 'text/xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storagePathRaw = searchParams.get('storagePath');
    let storagePath = '';

    if (storagePathRaw) {
      storagePath = storagePathRaw;
    } else {
      const targetPath = searchParams.get('path');
      const workspace = searchParams.get('workspace') || 'business';

      if (!targetPath) {
        return new NextResponse('Path or storagePath parameter is required', { status: 400 });
      }

      const cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
      storagePath = `${workspace}/${cleanPath}`.replace(/\/+/g, '/');
    }

    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(storagePath);

    if (error) {
       console.error("Raw Stream Storage Error:", error);
       return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = await data.arrayBuffer();
    const ext = path.extname(storagePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // The NextResponse handler accepts ArrayBuffer natively
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
