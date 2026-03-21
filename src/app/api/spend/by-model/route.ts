import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

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
