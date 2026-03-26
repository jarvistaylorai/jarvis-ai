import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const orchestrator = await prisma.agents.findFirst({ where: { handle: 'orchestrator' }, select: { id: true } });
    const globalId = orchestrator?.id;

    const records = await prisma.agent_context_files.findMany({
      orderBy: { updated_at: 'desc' },
      take: 20,
      select: {
        id: true,
        agent_id: true,
        file_name: true,
        updated_at: true,
        created_at: true,
        content: true,
        agents: { select: { handle: true, name: true } }
      }
    });

    const mapped = records.map(r => ({
      id: r.id,
      agent_id: r.agent_id,
      file_name: r.file_name,
      updated_at: r.updated_at,
      created_at: r.created_at,
      scope: r.agent_id === globalId ? 'global' : 'agent-specific',
      agent_handle: r.agents?.handle || 'unknown',
      content_preview: r.content.length > 100 ? r.content.substring(0, 100) + '...' : r.content
    }));

    return NextResponse.json({ success: true, count: mapped.length, records: mapped });
  } catch (error) {
    console.error('[Memory Debug Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to list memories' }, { status: 500 });
  }
}

