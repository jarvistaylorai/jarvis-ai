import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getOpenAIdailySpend, getOpenAIUsageByModel } from '@/lib/openai-spend';

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

    let totalSpend24h = agg24h._sum?.cost || 0;
    let totalSpend7d = agg7d._sum?.cost || 0;
    let totalSpend30d = agg30d._sum?.cost || 0;
    // Total historical
    let allCost = allAgg._sum?.cost || 0;
    let allTokens = allAgg._sum?.tokens_total || 0;
    const allSessions = allAgg._count || 0;

    // Attempt OpenAI real-time inject
    try {
      const openAiData = await getOpenAIdailySpend(30);
      if (openAiData && openAiData.length > 0) {
        let openAi7d = 0;
        let openAi30d = 0;
        let openAi24h = 0;
        
        const nowMs = Date.now();
        const date7Ms = nowMs - 7 * 86400000;
        const date30Ms = nowMs - 30 * 86400000;
        const date7 = new Date(date7Ms).toISOString().split('T')[0];
        const date30 = new Date(date30Ms).toISOString().split('T')[0];
        
        // Use the absolute latest daily bucket from the array to prevent UTC rollover bug
        if (openAiData.length > 0) {
           openAi24h = openAiData[openAiData.length - 1].spend;
        }
        
        for (const item of openAiData) {
          if (item.date >= date7) openAi7d += item.spend;
          if (item.date >= date30) openAi30d += item.spend;
        }

        totalSpend24h = openAi24h;
        totalSpend7d = openAi7d;
        totalSpend30d = openAi30d;
        allCost = openAi30d; // Base blended cost on last 30d if openai active
      }
      
      const openAiUsage = await getOpenAIUsageByModel(7);
      if (openAiUsage && openAiUsage.length > 0) {
         let openAiTokens = 0;
         for (const m of openAiUsage) openAiTokens += m.tokens;
         allTokens = openAiTokens;
      }
    } catch (e) {
      console.error('OpenAi Override error:', e);
    }

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
