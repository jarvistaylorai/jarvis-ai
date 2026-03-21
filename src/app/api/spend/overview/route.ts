import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';
    const now = Date.now();
    const [agg24h, agg7d, agg30d, allAgg] = await Promise.all([
      prisma.spendLog.aggregate({
        _sum: { cost: true, tokens_total: true },
        _count: true,
        where: { workspace, created_at: { gte: new Date(now - 24 * 60 * 60 * 1000) } }
      }),
      prisma.spendLog.aggregate({
        _sum: { cost: true },
        where: { workspace, created_at: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } }
      }),
      prisma.spendLog.aggregate({
        _sum: { cost: true },
        where: { workspace, created_at: { gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } }
      }),
      prisma.spendLog.aggregate({
        _sum: { cost: true, tokens_total: true },
        _count: true,
        where: { workspace }
      })
    ]);

    const totalSpend24h = agg24h._sum?.cost || 0;
    const totalSpend7d = agg7d._sum?.cost || 0;
    const totalSpend30d = agg30d._sum?.cost || 0;
    
    // Total historical
    const allCost = allAgg._sum?.cost || 0;
    const allTokens = allAgg._sum?.tokens_total || 0;
    const allSessions = allAgg._count || 0;

    // Use total historical for blended cost if possible, otherwise 0
    const blendedCostPer1k = allTokens > 0 ? (allCost / allTokens) * 1000 : 0;
    const avgCostPerTask = allSessions > 0 ? (allCost / allSessions) : 0;

    // We do simple agent count logic: count distinct agents
    const distinctAgents = await prisma.spendLog.groupBy({
      by: ['agent_id'],
      where: { workspace },
      _count: true
    });
    const avgCostPerAgent = distinctAgents.length > 0 ? (allCost / distinctAgents.length) : 0;

    return NextResponse.json({
      totalSpend24h,
      totalSpend7d,
      totalSpend30d,
      totalTokens: allTokens,
      avgCostPerTask,
      avgCostPerAgent,
      blendedCostPer1k
    });
  } catch (error) {
    console.error('Spend Overview Error:', error);
    return NextResponse.json({ error: 'Failed to fetch overview spend data' }, { status: 500 });
  }
}
