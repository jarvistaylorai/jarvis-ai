import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    // In SQLite, DATE() extracts the date part. Prisma doesn't have a built-in DATE() group-by for SQLite yet.
    // So we will query the raw aggregation.
    
    const timeseries = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(cost) as spend
      FROM SpendLog
      WHERE workspace = ${workspace}
      GROUP BY date
      ORDER BY date ASC
      LIMIT 30
    `;

    return NextResponse.json(timeseries);
  } catch (error) {
    console.error('Spend Timeseries Error:', error);
    return NextResponse.json({ error: 'Failed to fetch timeseries data' }, { status: 500 });
  }
}
