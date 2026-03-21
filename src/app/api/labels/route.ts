import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');
    const workspace = searchParams.get('workspace') || 'business';

    const labels = await prisma.taskLabel.findMany({
      where: project_id ? { project_id, workspace } : { workspace },
      orderBy: [{ position: 'asc' }, { name: 'asc' }]
    });

    return NextResponse.json(labels);
  } catch (error) {
    console.error('Error fetching labels:', error);
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';
    const { project_id, name, color } = await request.json();

    if (!project_id || !name || !color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const count = await prisma.taskLabel.count({
      where: { project_id, workspace }
    });

    const label = await prisma.taskLabel.create({
      data: { workspace, project_id, name, color, position: count }
    });

    return NextResponse.json(label);
  } catch (error) {
    console.error('Error creating label:', error);
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 });
  }
}
