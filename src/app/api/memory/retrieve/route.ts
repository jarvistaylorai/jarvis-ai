/**
 * POST /api/memory/retrieve
 * Retrieve relevant memories based on semantic query
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryService } from '@/lib/services/memoryService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { query, agentId, projectId, taskId, types, limit, minScore } = body;

    const results = await memoryService.retrieve({
      query,
      agentId,
      projectId,
      taskId,
      types,
      limit: limit || 5,
      minScore: minScore || 0.7,
    });

    return NextResponse.json({
      memories: results,
      count: results.length,
      query,
    });

  } catch (error) {
    console.error('[Memory Retrieve Error]', error);
    return NextResponse.json(
      { error: 'Failed to retrieve memories', details: (error as Error).message },
      { status: 500 }
    );
  }
}