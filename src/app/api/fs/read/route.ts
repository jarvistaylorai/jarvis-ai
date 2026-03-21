import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import { getSafeFsPath } from '../fs-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path');
    const workspace = searchParams.get('workspace') || 'business';

    if (!targetPath) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    const absolutePath = getSafeFsPath(targetPath, workspace);

    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        return NextResponse.json({ error: 'Path is not a file' }, { status: 400 });
      }
    } catch (e: any) {
       if (e.code === 'ENOENT') {
          return NextResponse.json({ error: 'File not found' }, { status: 404 });
       }
       throw e;
    }

    const content = await fs.readFile(absolutePath, 'utf-8');

    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
