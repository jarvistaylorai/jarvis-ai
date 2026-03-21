import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import { getSafeFsPath } from '../fs-utils';
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

    const absoluteDir = getSafeFsPath(targetPath, workspace);
    
    // Ensure the directory exists
    try {
      await fs.access(absoluteDir);
    } catch {
      await fs.mkdir(absoluteDir, { recursive: true });
    }

    const absolutePath = path.join(absoluteDir, file.name);

    // Read the file data
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write file
    await fs.writeFile(absolutePath, buffer);

    return NextResponse.json({ success: true, path: path.join(targetPath, file.name).replace(/\\/g, '/') });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 });
  }
}
