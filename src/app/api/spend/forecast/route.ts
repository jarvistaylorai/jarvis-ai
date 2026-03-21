import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    const now = Date.now();
    // Get last 7 days spend
    const agg7d = await prisma.spendLog.aggregate({
      _sum: { cost: true },
      where: { workspace, created_at: { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } }
    });

    const last7DaysSpend = agg7d._sum.cost || 0;
    
    // Algorithm requested by user
    const projectedMonthly = (last7DaysSpend / 7) * 30;

    return NextResponse.json({
      runRate7d: last7DaysSpend,
      projectedMonthly
    });
  } catch (error) {
    console.error('Spend Forecast Error:', error);
    return NextResponse.json({ error: 'Failed to fetch spend forecast' }, { status: 500 });
  }
}
