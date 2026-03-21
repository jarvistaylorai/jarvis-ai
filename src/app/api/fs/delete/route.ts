import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { getSafeFsPath, getWorkspaceRoot } from '../fs-utils';

export async function POST(request: Request) {
  try {
    const { targetPath, workspace = 'business' } = await request.json();

    if (!targetPath) {
      return NextResponse.json({ error: 'targetPath is required' }, { status: 400 });
    }

    const absolutePath = getSafeFsPath(targetPath, workspace);
    const root = getWorkspaceRoot(workspace);

    // Prevent deleting the root workspace
    if (absolutePath === root) {
      return NextResponse.json({ error: 'Cannot delete root workspace' }, { status: 403 });
    }

    await fs.rm(absolutePath, { recursive: true, force: true });

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
