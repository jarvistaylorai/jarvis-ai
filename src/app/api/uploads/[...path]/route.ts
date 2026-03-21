import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import mime from 'mime';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: resolvedPath } = await params;
    const filePathArray = resolvedPath || [];
    
    // Construct absolute path
    const homeDir = os.homedir();
    const absolutePath = path.join(homeDir, 'jarvis/uploads', ...filePathArray);

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(absolutePath);
    const fileExtension = path.extname(absolutePath);
    const mimeType = mime.getType(fileExtension) || 'application/octet-stream';
    
    // Read the file buffer
    const fileBuffer = fs.readFileSync(absolutePath);
    
    // Create modern response with buffer
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error streaming file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
