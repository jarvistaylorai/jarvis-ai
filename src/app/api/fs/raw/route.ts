import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import { getSafeFsPath } from '../fs-utils';
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
    const targetPath = searchParams.get('path');

    if (!targetPath) {
      return new NextResponse('Path parameter is required', { status: 400 });
    }

    const absolutePath = getSafeFsPath(targetPath);

    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        return new NextResponse('Path is not a file', { status: 400 });
      }
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return new NextResponse('File not found', { status: 404 });
      }
      throw e;
    }

    const fileBuffer = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

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
