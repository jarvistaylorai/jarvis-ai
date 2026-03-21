import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.target_date !== undefined) data.target_date = body.target_date ? new Date(body.target_date) : null;
    if (body.position !== undefined) data.position = body.position;

    const phase = await prisma.phase.update({
      where: { id },
      data
    });

    return NextResponse.json(phase);
  } catch (error: any) {
    console.error('API Error [PATCH /api/phases/:id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Unlink any tasks from this phase before deleting
    await prisma.task.updateMany({
      where: { phase_id: id },
      data: { phase_id: null }
    });

    await prisma.phase.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error [DELETE /api/phases/:id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
