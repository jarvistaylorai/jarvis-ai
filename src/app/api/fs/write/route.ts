import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getSafeFsPath, ensureDirectory } from '../fs-utils';

export async function POST(request: Request) {
  try {
    const { targetPath, content, isFolder, workspace = 'business' } = await request.json();

    if (!targetPath) {
      return NextResponse.json({ error: 'targetPath is required' }, { status: 400 });
    }

    const absolutePath = getSafeFsPath(targetPath, workspace);

    if (isFolder) {
      await ensureDirectory(absolutePath);
      return NextResponse.json({ success: true, message: 'Folder created successfully' });
    }

    // Ensure parent directory exists for file
    await ensureDirectory(path.dirname(absolutePath));

    await fs.writeFile(absolutePath, content || '', 'utf-8');

    return NextResponse.json({ success: true, message: 'File written successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
