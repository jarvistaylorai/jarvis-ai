import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { detectAnomalies } from '@/lib/spend/detectAnomalies';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    const now = Date.now();
    
    const [agg24h, agg7d] = await Promise.all([
      prisma.spendLog.aggregate({
        _sum: { cost: true },
        where: { workspace, created_at: { gte: new Date(now - 24 * 60 * 60 * 1000) } }
      }),
      prisma.spendLog.aggregate({
        _sum: { cost: true },
        where: { workspace, created_at: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } }
      })
    ]);

    const todaySpend = agg24h._sum.cost || 0;
    const weekSpend = agg7d._sum.cost || 0;
    
    // Average 7 days
    const avg7dSpend = weekSpend / 7;

    const anomalies = detectAnomalies(todaySpend, avg7dSpend);

    return NextResponse.json(anomalies);
  } catch (error) {
    console.error('Spend Anomalies Error:', error);
    return NextResponse.json({ error: 'Failed to fetch anomalies' }, { status: 500 });
  }
}
