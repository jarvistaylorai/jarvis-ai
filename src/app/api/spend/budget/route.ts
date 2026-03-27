import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    return NextResponse.json({
      ...config,
      monthly_budget_limit: 35.0 // Synchronized to OpenAI Hard-Cap for alert tracking
    });
  } catch (error) {
    console.error('Spend Budget Error:', error);
    return NextResponse.json({ error: 'Failed to fetch budget configuration' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
        const { monthly_budget_limit, id, ...dbData } = data;
    
    const merged = await prisma.spendLimit.upsert({
      where: { id: "global" },
      update: dbData,
      create: { id: "global", ...dbData }
    });

    return NextResponse.json({
      ...merged,
      monthly_budget_limit: monthly_budget_limit || 35.0
    });
  } catch (error) {
    console.error('Spend Budget POST Error:', error);
    return NextResponse.json({ error: 'Failed to save budget configuration' }, { status: 500 });
  }
}
