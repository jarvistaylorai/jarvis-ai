import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getOpenAIUsageByModel, getOpenAIdailySpend } from '@/lib/openai-spend';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    try {
      const openAiUsage = await getOpenAIUsageByModel(7);
      if (openAiUsage && openAiUsage.length > 0) {
         let totalCost = 0;
         const openAiCosts = await getOpenAIdailySpend(7);
         if (openAiCosts && openAiCosts.length > 0) {
            totalCost = openAiCosts.reduce((sum, b) => sum + b.spend, 0);
         }
         
         const allTokens = openAiUsage.reduce((s, m) => s + m.tokens, 0);

         const mapped = openAiUsage.map((m: Record<string, any>) => {
            if (allTokens > 0) {
              m.spend = (m.tokens / allTokens) * totalCost;
            } else {
              m.spend = 0;
            }
            return m;
         });
         return NextResponse.json(mapped.sort((a,b) => b.spend - a.spend));
      }
    } catch(e) {
      console.error('OpenAI Models pipeline failed', e);
    }

    const grouped = await prisma.spendLog.groupBy({
      by: ['model'],
      where: { workspace },
      _sum: {
        cost: true,
        tokens_total: true
      },
      _count: true,
      orderBy: {
        _sum: {
          cost: 'desc'
        }
      }
    });

    const modelData = grouped.map((g) => {
       return {
         id: g.model,
         name: g.model,
         spend: g._sum.cost || 0,
         tokens: g._sum.tokens_total || 0,
         sessions: g._count
       };
    });

    return NextResponse.json(modelData);
  } catch (error) {
    console.error('Spend By Model Error:', error);
    return NextResponse.json({ error: 'Failed to fetch model spend data' }, { status: 500 });
  }
}
