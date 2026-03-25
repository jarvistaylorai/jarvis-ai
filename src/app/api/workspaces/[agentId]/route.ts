import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    
    if (!agentId) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const agent = await prisma.agents.findFirst({
      where: { handle: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const contextFiles = await prisma.agent_context_files.findMany({
      where: { agent_id: agent.id }
    });

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

    // Get from DB
    for (const fileRecord of contextFiles) {
      filesContent[fileRecord.file_name] = fileRecord.content;
    }

    // Default missing core files to empty strings
    for (const file of coreFiles) {
      if (!(file in filesContent)) {
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
    
    if (!agentId) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const { file, content } = await request.json();

    if (!file || typeof file !== 'string' || !file.endsWith('.md')) {
      return NextResponse.json({ error: 'Invalid file parameter' }, { status: 400 });
    }

    if (typeof content !== 'string') {
       return NextResponse.json({ error: 'Invalid content parameter' }, { status: 400 });
    }

    const agent = await prisma.agents.findFirst({
      where: { handle: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    await prisma.agent_context_files.upsert({
      where: {
        agent_id_file_name: {
          agent_id: agent.id,
          file_name: file
        }
      },
      update: {
        content: content
      },
      create: {
        agent_id: agent.id,
        file_name: file,
        content: content
      }
    });

    return NextResponse.json({ success: true, message: `File ${file} updated successfully` });
  } catch (error) {
    console.error('Error updating agent file:', error);
    return NextResponse.json({ error: 'Failed to update agent file' }, { status: 500 });
  }
}
