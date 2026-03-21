import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';
    const { project_id, name } = await request.json();

    if (!project_id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the max position to append to the end
    const lastList = await prisma.taskList.findFirst({
      where: { project_id },
      orderBy: { position: 'desc' }
    });

    const position = lastList ? lastList.position + 1024 : 1024;

    const list = await prisma.taskList.create({
      data: {
        workspace,
        project_id,
        name,
        position
      }
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error('Error creating list:', error);
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
  }
}
