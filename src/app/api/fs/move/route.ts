import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { getSafeFsPath, ROOT_WORKSPACE_PATH } from '../fs-utils';

export async function POST(request: Request) {
  try {
    const { sourcePath, destinationPath } = await request.json();

    if (!sourcePath || !destinationPath) {
      return NextResponse.json({ error: 'sourcePath and destinationPath are required' }, { status: 400 });
    }

    const absoluteSource = getSafeFsPath(sourcePath);
    const absoluteDestination = getSafeFsPath(destinationPath);

    // Prevent moving the root workspace
    if (absoluteSource === ROOT_WORKSPACE_PATH) {
      return NextResponse.json({ error: 'Cannot move root workspace' }, { status: 403 });
    }

    await fs.rename(absoluteSource, absoluteDestination);

    return NextResponse.json({ success: true, message: 'Moved successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
