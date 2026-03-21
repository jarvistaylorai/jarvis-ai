import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '200');
  const workspace = searchParams.get('workspace') || 'business';

  try {
    const logs = await prisma.spendLog.findMany({
      where: { workspace },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        created_at: true,
        agent_id: true,
        model: true,
        provider: true,
        tokens_input: true,
        tokens_output: true,
        tokens_total: true,
        cost: true,
        task_id: true,
        project_id: true
      }
    });

    const parsedLogs = logs.map(l => ({
      id: l.id,
      timestamp: l.created_at,
      agent: l.agent_id, // simple mapping for frontend
      model: l.model,
      provider: l.provider,
      tokens: l.tokens_total,
      cost: l.cost,
      task_id: l.task_id,
      project_id: l.project_id
    }));

    return NextResponse.json(parsedLogs);
  } catch (error) {
    console.error('Spend Logs Error:', error);
    return NextResponse.json({ error: 'Failed to fetch spend logs' }, { status: 500 });
  }
}
