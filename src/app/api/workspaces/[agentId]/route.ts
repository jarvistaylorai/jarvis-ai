import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    
    if (!agentId || agentId.includes('..')) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const agentDir = path.join(process.cwd(), 'agents', agentId);
    
    try {
      await fs.access(agentDir);
    } catch {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const coreFiles = [
      'IDENTITY.md',
      'MISSION.md',
      'OPERATIONS.md',
      'MEMORY.md',
      'CONTEXT.md',
      'TASKS.md',
      'TOOLS.md'
    ];

    const filesContent: Record<string, string> = {};

    for (const file of coreFiles) {
      const filePath = path.join(agentDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        filesContent[file] = content;
      } catch (err) {
        // If file doesn't exist, we just skip or provide empty content
        filesContent[file] = '';
      }
    }

    return NextResponse.json({ agentId, files: filesContent });
  } catch (error) {
    console.error('Error reading agent files:', error);
    return NextResponse.json({ error: 'Failed to read agent files' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    
    if (!agentId || agentId.includes('..')) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const { file, content } = await request.json();

    if (!file || typeof file !== 'string' || file.includes('..') || !file.endsWith('.md')) {
      return NextResponse.json({ error: 'Invalid file parameter' }, { status: 400 });
    }

    if (typeof content !== 'string') {
       return NextResponse.json({ error: 'Invalid content parameter' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'agents', agentId, file);
    
    // Ensure the directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write new content
    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({ success: true, message: `File ${file} updated successfully` });
  } catch (error) {
    console.error('Error updating agent file:', error);
    return NextResponse.json({ error: 'Failed to update agent file' }, { status: 500 });
  }
}
