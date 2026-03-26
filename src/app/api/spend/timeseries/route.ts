import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getOpenAIdailySpend } from '@/lib/openai-spend';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    try {
       const openAiData = await getOpenAIdailySpend(30);
       if (openAiData && openAiData.length > 0) {
         return NextResponse.json(openAiData);
       }
    } catch (e) {
       console.error('OpenAI TS error', e);
    }

    // In SQLite, DATE() extracts the date part. Prisma doesn't have a built-in DATE() group-by for SQLite yet.
    // So we will query the raw aggregation.
    
    const timeseries = await prisma.$queryRaw`
      SELECT 
        CAST(created_at AS DATE) as date,
        SUM(cost) as spend
      FROM "spendLog"
      WHERE workspace = ${workspace}
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date ASC
      LIMIT 30
    `;

    return NextResponse.json(timeseries);
  } catch (error) {
    console.error('Spend Timeseries Error:', error);
    return NextResponse.json({ error: 'Failed to fetch timeseries data' }, { status: 500 });
  }
}
