import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.phases || !Array.isArray(body.phases)) {
      return NextResponse.json({ error: 'phases array is required' }, { status: 400 });
    }

    // body.phases = [{ id, position }, ...]
    await prisma.$transaction(
      body.phases.map((p: { id: string; position: number }) =>
        prisma.phase.update({
          where: { id: p.id },
          data: { position: p.position }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error [POST /api/phases/reorder]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
