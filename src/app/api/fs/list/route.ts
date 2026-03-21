import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { getSafeFsPath, ensureDirectory, getWorkspaceRoot } from '../fs-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path') || '/';
    const workspace = searchParams.get('workspace') || 'business';

    const absolutePath = getSafeFsPath(targetPath, workspace);
    
    // Ensure root exists on first load
    const root = getWorkspaceRoot(workspace);
    await ensureDirectory(root);

    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
      }
    } catch (e: any) {
       if (e.code === 'ENOENT') {
          return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
       }
       throw e;
    }

    const dirents = await fs.readdir(absolutePath, { withFileTypes: true });

    const items = await Promise.all(
      dirents.map(async (dirent) => {
        const itemPath = path.join(absolutePath, dirent.name);
        const stats = await fs.stat(itemPath);
        
        let childrenCount = 0;
        if (dirent.isDirectory()) {
            try {
               const cd = await fs.readdir(itemPath);
               childrenCount = cd.length;
            } catch(e) {}
        }

        return {
          id: Buffer.from(itemPath).toString('base64'),
          name: dirent.name,
          type: dirent.isDirectory() ? 'folder' : 'file',
          size: stats.size, // in bytes
          items: dirent.isDirectory() ? childrenCount : 0,
          modified_at: stats.mtime.toISOString(),
          path: path.join(targetPath, dirent.name).replace(/\\/g, '/').replace('//', '/')
        };
      })
    );

    // Sort folders first, then files alphabetically
    items.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
