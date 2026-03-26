/**
 * POST /api/memory/retrieve
 * Retrieve relevant memories based on semantic query
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/services/memoryService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  try {
    const body = await request.json();
    const { query, agentId, limit, minScore } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: 'Valid query string is required' }, { status: 400 });
    }

    const parsedMinScore = minScore !== undefined ? parseFloat(minScore) : 0.05;
    const parsedLimit = limit !== undefined ? parseInt(limit, 10) : 5;

    const results = await memoryService.retrieve({
      query,
      agentId,
      limit: parsedLimit,
      minScore: parsedMinScore,
    });

    const timing = Date.now() - start;
    console.log(`[Memory Retrieve] Query="${query}" Agent="${agentId}" Found=${results.length} Latency=${timing}ms`);

    return NextResponse.json({
      success: true,
      query,
      matches: results,
      count: results.length,
      metadata: {
        timing_ms: timing,
        threshold_used: parsedMinScore,
        limit: parsedLimit
      }
    });

  } catch (error) {
    console.error('[Memory Retrieve Error]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve memories', details: (error as Error).message },
      { status: 500 }
    );
  }
}