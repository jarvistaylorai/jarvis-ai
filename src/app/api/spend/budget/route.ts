import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    let config = await prisma.spendLimit.findFirst({
      where: { id: "global" }
    });
    
    if (!config) {
      config = await prisma.spendLimit.create({
        data: {
          id: "global",
          global_daily_limit: 50.0,
          per_agent_limit: 10.0,
          per_task_limit: 2.0,
          per_model_limit: 20.0
        }
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Spend Budget Error:', error);
    return NextResponse.json({ error: 'Failed to fetch budget configuration' }, { status: 500 });
  }
}
