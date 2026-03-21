import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    const grouped = await prisma.spendLog.groupBy({
      by: ['agent_id'],
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

    const agentData = grouped.map((g) => {
      const spend = g._sum.cost || 0;
      const tokens = g._sum.tokens_total || 0;
      const sessions = g._count;
      const avgCost = sessions > 0 ? spend / sessions : 0;
      // Formula for "Efficiency Score" (Simulated as dynamic vs Cost)
      const efficiencyScore = Math.max(0, 100 - (avgCost * 100));

      return {
        id: g.agent_id,
        name: g.agent_id, // Assuming name config matches id roughly here, or caller joins it.
        spend,
        tokens,
        sessions,
        avgCost,
        efficiencyScore
      };
    });

    return NextResponse.json(agentData);
  } catch (error) {
    console.error('Spend By Agent Error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent spend data' }, { status: 500 });
  }
}
