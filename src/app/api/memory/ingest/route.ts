import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/services/memoryService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  try {
    const body = await request.json();
    const { content, title, source, agentId, tags, metadata } = body;

    // Ensure agent ID
    let finalAgentId = agentId;
    if (!finalAgentId || typeof finalAgentId !== 'string') {
      const orchestrator = await prisma.agents.findFirst({ where: { handle: 'orchestrator' } });
      if (!orchestrator) {
        return NextResponse.json({ success: false, error: 'No agentId provided and no default orchestrator agent found in system' }, { status: 400 });
      }
      finalAgentId = orchestrator.id;
    }

    const fileName = title || source || `memory-${Date.now()}.txt`;

    const record = await memoryService.store({
      content,
      type: 'document',
      agentId: finalAgentId,
      metadata: {
        file_name: fileName,
        source: source || 'manual_ingestion',
        tags: Array.isArray(tags) ? tags : [],
        ...metadata,
      }
    });

    const timing = Date.now() - start;
    console.log(`[Memory Ingest] Agent="${finalAgentId}" Title="${fileName}" Latency=${timing}ms`);

    return NextResponse.json({
      success: true,
      message: 'Memory record successfully ingested',
      record_id: record.id,
      agent_id: finalAgentId,
      file_name: record.file_name,
      metadata: {
        timing_ms: timing
      }
    });

  } catch (error) {
    console.error('[Memory Ingest Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to ingest memory', details: (error as Error).message },
      { status: 500 }
    );
  }
}
