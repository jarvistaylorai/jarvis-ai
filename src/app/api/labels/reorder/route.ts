import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(request: Request) {
  try {
    const { labelIds } = await request.json();

    if (!Array.isArray(labelIds)) {
      return NextResponse.json({ error: 'labelIds array is required' }, { status: 400 });
    }

    // Use a transaction to perform all updates sequentially
    await prisma.$transaction(
      labelIds.map((id, index) =>
        prisma.labels.update({
          where: { id },
          data: { position: index }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering labels:', error);
    return NextResponse.json({ error: 'Failed to reorder labels' }, { status: 500 });
  }
}
