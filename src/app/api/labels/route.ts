import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');
    let workspace = searchParams.get('workspace') || '00000000-0000-0000-0000-000000000000';
    if (workspace === 'business') workspace = '00000000-0000-0000-0000-000000000000';

    const labels = await prisma.labels.findMany({
      where: project_id ? { project_id, workspace_id: workspace } : { workspace_id: workspace },
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
    let workspace = searchParams.get('workspace') || '00000000-0000-0000-0000-000000000000';
    if (workspace === 'business') workspace = '00000000-0000-0000-0000-000000000000';
    const { project_id, name, color } = await request.json();

    if (!project_id || !name || !color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const count = await prisma.labels.count({
      where: { project_id, workspace_id: workspace }
    });

    const label = await prisma.labels.create({
      data: { workspace_id: workspace, project_id, name, color, position: count }
    });

    return NextResponse.json(label);
  } catch (error) {
    console.error('Error creating label:', error);
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 });
  }
}
