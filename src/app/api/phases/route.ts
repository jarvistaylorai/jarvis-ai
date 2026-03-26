import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.objective_id || !body.title) {
      return NextResponse.json({ error: 'objective_id and title are required' }, { status: 400 });
    }

    // Get the highest position for this objective
    const lastPhase = await prisma.phase.findFirst({
      where: { objective_id: body.objective_id },
      orderBy: { position: 'desc' }
    });

    const position = lastPhase ? lastPhase.position + 1024 : 1024;

    const phase = await prisma.phase.create({
      data: {
        objective_id: body.objective_id,
        title: body.title,
        position,
        target_date: body.target_date ? new Date(body.target_date) : null,
      }
    });

    return NextResponse.json(phase, { status: 201 });
  } catch (error: unknown) {
    console.error('API Error [POST /api/phases]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
